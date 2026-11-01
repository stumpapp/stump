use std::collections::{BTreeSet, HashMap};

use models::{
	entity::{library, library_config, media, media_metadata, series},
	shared::enums::{FileStatus, OrganizationMode, SeriesKind},
};
use sea_orm::{
	prelude::*,
	sea_query::{OnConflict, Query, SimpleExpr},
	ExprTrait, Iterable, QuerySelect, Set,
};

use crate::{
	database::{get_insert_batch_size, SQLITE_BIND_LIMIT},
	image::thumbnail::bump_media_thumbnail_fallbacks,
	CoreError, CoreResult,
};

/// Moves the book into the virtual series named by its metadata, returning the updated book
/// and the thumbnails of any series it left empty (see [refresh_series])
pub async fn sync_media_membership<C: ConnectionTrait>(
	txn: &C,
	book: media::Model,
	series_name: Option<String>,
) -> CoreResult<(media::Model, Vec<String>)> {
	let config = library_config::Entity::find()
		.filter(library_config::Column::LibraryId.eq(&book.library_id))
		.one(txn)
		.await?
		.ok_or_else(|| CoreError::NotFound("Library configuration".into()))?;
	if config.organization_mode != OrganizationMode::Metadata {
		return Ok((book, vec![]));
	}
	let (ids, _) =
		resolve_series_membership(txn, &book.library_id, &[series_name]).await?;
	let series_id = ids.into_iter().next().flatten();
	bump_media_thumbnail_fallbacks(txn, &book.library_id, None).await?;
	let previous = book.series_id.clone();
	let mut active: media::ActiveModel = book.into();
	active.series_id = Set(series_id.clone());
	let book = active.update(txn).await?;
	let thumbnails = refresh_series(txn, previous.into_iter().chain(series_id)).await?;
	Ok((book, thumbnails))
}

/// Deletes the metadata of the books in scope and takes books in metadata libraries out of
/// their series, returning the thumbnails of any series left empty (see [refresh_series])
pub async fn reset_media_metadata<C: ConnectionTrait>(
	txn: &C,
	scope: SimpleExpr,
) -> CoreResult<Vec<String>> {
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
	let previous_series = media::Entity::find()
		.select_only()
		.column(media::Column::SeriesId)
		.distinct()
		.filter(scope.clone())
		.filter(media::Column::SeriesId.is_not_null())
		.into_tuple::<String>()
		.all(txn)
		.await?;
	media_metadata::Entity::delete_many()
		.filter(media_metadata::Column::MediaId.in_subquery(ids(media::Column::Id)))
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
	refresh_series(txn, previous_series).await
}

/// Marks the given series as updated and deletes the virtual ones no book belongs to anymore,
/// returning the thumbnail paths of the deleted series. Remove those with
/// [remove_series_thumbnails] once the transaction has committed.
pub async fn refresh_series<C: ConnectionTrait>(
	txn: &C,
	series_ids: impl IntoIterator<Item = String>,
) -> CoreResult<Vec<String>> {
	let ids: Vec<_> = series_ids
		.into_iter()
		.collect::<BTreeSet<_>>()
		.into_iter()
		.collect();
	let updated_at = Some(chrono::Utc::now().fixed_offset());
	let has_books = Query::select()
		.expr(Expr::val(1))
		.from(media::Entity)
		.and_where(
			Expr::col((media::Entity, media::Column::SeriesId))
				.equals((series::Entity, series::Column::Id)),
		)
		.to_owned();
	let mut thumbnails = Vec::new();
	for chunk in ids.chunks(SQLITE_BIND_LIMIT - 2) {
		series::Entity::update_many()
			.filter(series::Column::Id.is_in(chunk.to_vec()))
			.col_expr(series::Column::UpdatedAt, Expr::value(updated_at))
			.exec(txn)
			.await?;
		let deleted = series::Entity::delete_many()
			.filter(series::Column::Id.is_in(chunk.to_vec()))
			.filter(series::Column::Kind.eq(SeriesKind::Virtual))
			.filter(Expr::exists(has_books.clone()).not())
			.exec_with_returning(txn)
			.await?;
		thumbnails.extend(
			deleted
				.into_iter()
				.filter_map(|series| series.thumbnail_path),
		);
	}
	Ok(thumbnails)
}

/// Best-effort removal of the thumbnails returned by [refresh_series]
pub async fn remove_series_thumbnails(paths: Vec<String>) {
	for path in paths {
		if let Err(error) = tokio::fs::remove_file(&path).await {
			tracing::warn!(?error, path, "Failed to remove thumbnail of deleted series");
		}
	}
}

pub async fn resolve_series_membership<C: ConnectionTrait>(
	txn: &C,
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

#[cfg(test)]
mod tests {
	use ::tests::{db::test_database, fake_data};
	use sea_orm::{ActiveModelTrait, IntoActiveModel};

	use super::*;

	#[tokio::test]
	async fn test_virtual_series_is_deleted_when_its_last_book_leaves() {
		let db = test_database().await;
		let library = fake_data::Library::default().insert(&db).await;
		let mut config = library_config::Entity::find()
			.filter(library_config::Column::LibraryId.eq(&library.id))
			.one(&db)
			.await
			.unwrap()
			.unwrap()
			.into_active_model();
		config.organization_mode = Set(OrganizationMode::Metadata);
		config.update(&db).await.unwrap();

		let (ids, _) = resolve_series_membership(
			&db,
			&library.id,
			&[Some("Wayfarers".into()), Some("Murderbot".into())],
		)
		.await
		.unwrap();
		let [Some(wayfarers), Some(murderbot)] = ids.as_slice() else {
			panic!("both series should resolve");
		};
		series::Entity::update_many()
			.filter(series::Column::Id.eq(wayfarers))
			.col_expr(series::Column::ThumbnailPath, Expr::value("/thumbs/w.webp"))
			.exec(&db)
			.await
			.unwrap();
		let book = |series_id: &String| fake_data::Media {
			series_id: series_id.clone(),
			..Default::default()
		};
		let first = book(wayfarers).insert(&db).await;
		let second = book(wayfarers).insert(&db).await;
		book(murderbot).insert(&db).await;
		let filesystem = fake_data::Series {
			library_id: Some(library.id.clone()),
			..Default::default()
		}
		.insert(&db)
		.await;
		let exists = |id: String| {
			let db = &db;
			async move {
				series::Entity::find_by_id(id)
					.one(db)
					.await
					.unwrap()
					.is_some()
			}
		};

		let (_, thumbnails) = sync_media_membership(&db, first, Some("Murderbot".into()))
			.await
			.unwrap();
		assert!(thumbnails.is_empty(), "Wayfarers still has a book");
		assert!(exists(wayfarers.clone()).await);

		let (second, thumbnails) =
			sync_media_membership(&db, second, None).await.unwrap();
		assert_eq!(second.series_id, None);
		assert_eq!(thumbnails, vec!["/thumbs/w.webp".to_string()]);
		assert!(!exists(wayfarers.clone()).await);

		let thumbnails = refresh_series(&db, [filesystem.id.clone(), murderbot.clone()])
			.await
			.unwrap();
		assert!(thumbnails.is_empty());
		assert!(
			exists(filesystem.id).await,
			"filesystem series are never pruned"
		);
		assert!(exists(murderbot.clone()).await);
	}
}
