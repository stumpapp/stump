use std::collections::HashMap;

use async_graphql::{
	dataloader::DataLoader, ComplexObject, Context, Result, SimpleObject,
};

use models::{
	entity::{
		library, library_config, library_exclusion, library_scan_record, library_tag,
		series, tag, user,
	},
	shared::{
		alphabet::{AvailableAlphabet, EntityLetter},
		enums::UserPermission,
		image::ImageRef,
	},
};
use sea_orm::{
	prelude::*, sea_query::Query, DatabaseBackend, FromQueryResult, QueryOrder, Statement,
};

use crate::{
	data::{AuthContext, CoreContext, ServiceContext},
	guard::PermissionGuard,
	loader::favorite::{FavoriteLibraryLoaderKey, FavoritesLoader},
	object::library_scan_record::LibraryScanRecord,
};

use super::{library_config::LibraryConfig, series::Series, tag::Tag, user::User};

#[derive(Clone, Debug, SimpleObject)]
#[graphql(complex)]
pub struct Library {
	#[graphql(flatten)]
	pub model: library::Model,
}

impl From<library::Model> for Library {
	fn from(model: library::Model) -> Self {
		Self { model }
	}
}

#[ComplexObject]
impl Library {
	async fn config(&self, ctx: &Context<'_>) -> Result<LibraryConfig> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let config = library_config::Entity::find()
			.filter(library_config::Column::Id.eq(self.model.config_id))
			.one(conn)
			.await?
			.ok_or("Library config not found")?;

		Ok(config.into())
	}

	#[graphql(
		guard = "PermissionGuard::new(&[UserPermission::ReadUsers, UserPermission::ManageLibrary])"
	)]
	async fn excluded_users(&self, ctx: &Context<'_>) -> Result<Vec<User>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let users = user::Entity::find()
			.filter(
				user::Column::Id.in_subquery(
					Query::select()
						.column(library_exclusion::Column::UserId)
						.from(library_exclusion::Entity)
						.and_where(
							library_exclusion::Column::LibraryId
								.eq(self.model.id.clone()),
						)
						.to_owned(),
				),
			)
			.all(conn)
			.await?;

		Ok(users.into_iter().map(User::from).collect())
	}

	async fn is_favorite(&self, ctx: &Context<'_>) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let loader = ctx.data::<DataLoader<FavoritesLoader>>()?;

		let is_favorite = loader
			.load_one(FavoriteLibraryLoaderKey {
				user_id: user.id.clone(),
				library_id: self.model.id.clone(),
			})
			.await?;

		Ok(is_favorite.unwrap_or(false))
	}

	/// Get the details of the last scan job for this library, if any exists.
	async fn last_scan(&self, ctx: &Context<'_>) -> Result<Option<LibraryScanRecord>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let record = library_scan_record::Entity::find()
			.filter(library_scan_record::Column::LibraryId.eq(self.model.id.clone()))
			.order_by_desc(library_scan_record::Column::Timestamp)
			.one(conn)
			.await?;

		Ok(record.map(LibraryScanRecord::from))
	}

	async fn media_alphabet(&self, ctx: &Context<'_>) -> Result<HashMap<String, i64>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let query_result = conn
			.query_all(Statement::from_sql_and_values(
				DatabaseBackend::Sqlite,
				r"
				SELECT
					substr(COALESCE(media_metadata.title, media.name), 1, 1) AS letter,
					COUNT(DISTINCT media.id) AS count
				FROM
					media
				LEFT JOIN media_metadata ON media.id = media_metadata.media_id
				WHERE
					media.series_id IN (
						SELECT series.id 
						FROM series 
						WHERE series.library_id = $1
					)
				GROUP BY
					letter
				ORDER BY
					letter ASC;
				",
				[self.model.id.clone().into()],
			))
			.await?;

		let result = query_result
			.into_iter()
			.map(|res| EntityLetter::from_query_result(&res, "").map_err(|e| e.into()))
			.collect::<Result<Vec<EntityLetter>>>()?;

		let alphabet = AvailableAlphabet::from(result);

		Ok(alphabet.get())
	}

	/// Get the full history of scan jobs for this library.
	async fn scan_history(&self, ctx: &Context<'_>) -> Result<Vec<LibraryScanRecord>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let records = library_scan_record::Entity::find()
			.filter(library_scan_record::Column::LibraryId.eq(self.model.id.clone()))
			.order_by_desc(library_scan_record::Column::Timestamp)
			.all(conn)
			.await?;

		Ok(records.into_iter().map(LibraryScanRecord::from).collect())
	}

	// TODO(graphql): Pagination
	async fn series(&self, ctx: &Context<'_>) -> Result<Vec<Series>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let models = series::ModelWithMetadata::find()
			.filter(series::Column::LibraryId.eq(Some(self.model.id.clone())))
			.into_model::<series::ModelWithMetadata>()
			.all(conn)
			.await?;

		Ok(models.into_iter().map(Series::from).collect())
	}

	async fn series_alphabet(&self, ctx: &Context<'_>) -> Result<HashMap<String, i64>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let query_result = conn
			.query_all(Statement::from_sql_and_values(
				DatabaseBackend::Sqlite,
				r"
				SELECT
					substr(COALESCE(series_metadata.title, series.name), 1, 1) AS letter,
					COUNT(DISTINCT series.id) AS count
				FROM
					series
				LEFT JOIN series_metadata ON series.id = series_metadata.series_id
				WHERE
					series.library_id = $1
				GROUP BY
					letter
				ORDER BY
					letter ASC;
				",
				[self.model.id.clone().into()],
			))
			.await?;

		let result = query_result
			.into_iter()
			.map(|res| EntityLetter::from_query_result(&res, "").map_err(|e| e.into()))
			.collect::<Result<Vec<EntityLetter>>>()?;

		let alphabet = AvailableAlphabet::from(result);

		Ok(alphabet.get())
	}

	async fn stats(
		&self,
		ctx: &Context<'_>,
		all_users: Option<bool>,
	) -> Result<LibraryStats> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let result = conn
			.query_one(Statement::from_sql_and_values(
				DatabaseBackend::Sqlite,
				r"
				WITH base_counts AS (
					SELECT
						COUNT(*) AS book_count,
						IFNULL(SUM(media.size), 0) AS total_bytes,
						IFNULL(series_count, 0) AS series_count
					FROM
						media
						INNER JOIN (
							SELECT
								COUNT(*) AS series_count
							FROM
								series)
				),
				progress_counts AS (
					SELECT
						COUNT(frs.id) AS completed_books,
						COUNT(rs.id) AS in_progress_books
					FROM
						media m
						LEFT JOIN finished_reading_sessions frs ON frs.media_id = m.id
						LEFT JOIN reading_sessions rs ON rs.media_id = m.id
					WHERE $1 IS TRUE OR (rs.user_id = $2 OR frs.user_id = $2)
				)
				SELECT
					*
				FROM
					base_counts
					INNER JOIN progress_counts;
				",
				[all_users.unwrap_or(false).into(), user.id.clone().into()],
			))
			.await?
			.ok_or("Library stats failed to be calculated")?;

		Ok(LibraryStats::from_query_result(&result, "")?)
	}

	async fn tags(&self, ctx: &Context<'_>) -> Result<Vec<Tag>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let models = tag::Entity::find()
			.filter(
				tag::Column::Id.in_subquery(
					Query::select()
						.column(library_tag::Column::TagId)
						.from(library_tag::Entity)
						.and_where(
							library_tag::Column::LibraryId.eq(self.model.id.clone()),
						)
						.to_owned(),
				),
			)
			.all(conn)
			.await?;

		Ok(models.into_iter().map(Tag::from).collect())
	}

	/// A reference to the thumbnail image for the thumbnail. This will be a fully
	/// qualified URL to the image.
	async fn thumbnail(&self, ctx: &Context<'_>) -> Result<ImageRef> {
		let service = ctx.data::<ServiceContext>()?;

		// TODO: Spawn a blocking task to get the image dimensions
		// Use a cache as to not read the file system every time

		Ok(ImageRef {
			url: service
				.format_url(format!("/api/v2/library/{}/thumbnail", self.model.id)),
			// height: page_dimension.as_ref().map(|dim| dim.height),
			// width: page_dimension.as_ref().map(|dim| dim.width),
			..Default::default()
		})
	}
}

// Note: SQLx does not support u64 :'(
// See https://github.com/launchbadge/sqlx/issues/499
#[derive(Debug, FromQueryResult, SimpleObject)]
pub struct LibraryStats {
	series_count: i64,
	book_count: i64,
	total_bytes: i64,
	completed_books: i64,
	in_progress_books: i64,
}
