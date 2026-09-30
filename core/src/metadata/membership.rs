use std::collections::{BTreeSet, HashMap};

use models::{
	entity::{library, library_config, media, media_metadata, series},
	shared::enums::{FileStatus, OrganizationMode, SeriesKind},
};
use sea_orm::{
	prelude::*,
	sea_query::{OnConflict, Query, SimpleExpr},
	DatabaseTransaction, Iterable, Set,
};

use crate::{
	database::{get_insert_batch_size, SQLITE_BIND_LIMIT},
	image::thumbnail::bump_media_thumbnail_fallbacks,
	CoreError, CoreResult,
};

pub async fn sync_media_membership(
	txn: &DatabaseTransaction,
	book: media::Model,
	series_name: Option<String>,
) -> CoreResult<media::Model> {
	let config = library_config::Entity::find()
		.filter(library_config::Column::LibraryId.eq(&book.library_id))
		.one(txn)
		.await?
		.ok_or_else(|| CoreError::NotFound("Library configuration".into()))?;
	if config.organization_mode != OrganizationMode::Metadata {
		return Ok(book);
	}
	let (ids, _) =
		resolve_series_membership(txn, &book.library_id, &[series_name]).await?;
	let series_id = ids.into_iter().next().flatten();
	bump_media_thumbnail_fallbacks(txn, &book.library_id, None).await?;
	series::Entity::update_many()
		.filter(
			series::Column::Id
				.is_in(book.series_id.iter().chain(series_id.iter()).cloned()),
		)
		.col_expr(
			series::Column::UpdatedAt,
			Expr::value(Some(chrono::Utc::now().fixed_offset())),
		)
		.exec(txn)
		.await?;
	let mut active: media::ActiveModel = book.into();
	active.series_id = Set(series_id);
	Ok(active.update(txn).await?)
}

pub async fn reset_media_metadata(
	txn: &DatabaseTransaction,
	scope: SimpleExpr,
) -> CoreResult<()> {
	let ids = |column| {
		Query::select()
			.column(column)
			.from(media::Entity)
			.and_where(scope.clone())
			.to_owned()
	};
	let metadata_libraries = Query::select()
		.column(library_config::Column::LibraryId)
		.from(library_config::Entity)
		.and_where(
			library_config::Column::OrganizationMode.eq(OrganizationMode::Metadata),
		)
		.to_owned();
	let updated_at = Some(chrono::Utc::now().fixed_offset());
	media_metadata::Entity::delete_many()
		.filter(media_metadata::Column::MediaId.in_subquery(ids(media::Column::Id)))
		.exec(txn)
		.await?;
	series::Entity::update_many()
		.filter(series::Column::Id.in_subquery(ids(media::Column::SeriesId)))
		.col_expr(series::Column::UpdatedAt, Expr::value(updated_at))
		.exec(txn)
		.await?;
	library::Entity::update_many()
		.filter(library::Column::Id.in_subquery(ids(media::Column::LibraryId)))
		.col_expr(library::Column::UpdatedAt, Expr::value(updated_at))
		.exec(txn)
		.await?;
	media::Entity::update_many()
		.filter(scope)
		.filter(media::Column::LibraryId.in_subquery(metadata_libraries))
		.col_expr(media::Column::SeriesId, Expr::value(Option::<String>::None))
		.col_expr(media::Column::UpdatedAt, Expr::value(updated_at))
		.exec(txn)
		.await?;
	Ok(())
}

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
