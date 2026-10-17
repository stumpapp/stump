use std::collections::{BTreeSet, HashMap};

use models::{
	entity::series,
	shared::enums::{FileStatus, SeriesKind},
};
use sea_orm::{prelude::*, sea_query::OnConflict, DatabaseTransaction, Iterable, Set};

use crate::{
	database::{get_insert_batch_size, SQLITE_BIND_LIMIT},
	CoreError, CoreResult,
};

pub async fn resolve_series_membership(
	txn: &DatabaseTransaction,
	library_id: &str,
	series_names: &[Option<String>],
) -> CoreResult<(Vec<Option<String>>, u64)> {
	let names: Vec<_> = series_names
		.iter()
		.map(|name| {
			name.as_deref()
				.map(str::trim)
				.filter(|name| !name.is_empty())
		})
		.collect();
	let unique: Vec<_> = names
		.iter()
		.flatten()
		.copied()
		.collect::<BTreeSet<_>>()
		.into_iter()
		.collect();
	let mut created = 0;
	for chunk in unique.chunks(get_insert_batch_size(series::Column::iter().count())) {
		created +=
			series::Entity::insert_many(chunk.iter().map(|name| series::ActiveModel {
				id: Set(uuid::Uuid::new_v4().to_string()),
				name: Set((*name).to_string()),
				path: Set(None),
				kind: Set(SeriesKind::Virtual),
				library_id: Set(Some(library_id.to_string())),
				status: Set(FileStatus::Ready),
				is_oneshot: Set(false),
				created_at: Set(chrono::Utc::now().into()),
				..Default::default()
			}))
			.on_conflict(OnConflict::new().do_nothing().to_owned())
			.exec_without_returning(txn)
			.await?;
	}
	let mut ids = HashMap::new();
	for chunk in unique.chunks(SQLITE_BIND_LIMIT - 2) {
		for row in series::Entity::find()
			.filter(series::Column::LibraryId.eq(library_id))
			.filter(series::Column::Kind.eq(SeriesKind::Virtual))
			.filter(series::Column::Name.is_in(chunk.to_vec()))
			.all(txn)
			.await?
		{
			ids.insert(row.name, row.id);
		}
	}
	let memberships = names
		.into_iter()
		.map(|name| {
			name.map(|name| {
				ids.get(name).cloned().ok_or_else(|| {
					CoreError::InternalError(format!(
						"Failed to resolve metadata series {name}"
					))
				})
			})
			.transpose()
		})
		.collect::<CoreResult<Vec<_>>>()?;
	Ok((memberships, created))
}
