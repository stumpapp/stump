use async_graphql::{ComplexObject, Context, Result, SimpleObject};

use models::{
	entity::{
		library, library_config, library_hidden_to_user, library_scan_record,
		library_to_tag, series, tag, user,
	},
	shared::enums::UserPermission,
};
use sea_orm::{
	prelude::*, sea_query::Query, DatabaseBackend, FromQueryResult, QueryOrder, Statement,
};

use crate::{
	data::{CoreContext, RequestContext},
	guard::PermissionGuard,
};

use super::{library_config::LibraryConfig, series::Series, user::User};

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
						.column(library_hidden_to_user::Column::UserId)
						.from(library_hidden_to_user::Entity)
						.and_where(
							library_hidden_to_user::Column::LibraryId
								.eq(self.model.id.clone()),
						)
						.to_owned(),
				),
			)
			.all(conn)
			.await?;

		Ok(users.into_iter().map(User::from).collect())
	}

	// TODO(graphql): object type to load job details
	/// Get the details of the last scan job for this library, if any exists.
	async fn last_scan(
		&self,
		ctx: &Context<'_>,
	) -> Result<Option<library_scan_record::Model>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let record = library_scan_record::Entity::find()
			.filter(library_scan_record::Column::LibraryId.eq(self.model.id.clone()))
			.order_by_desc(library_scan_record::Column::Timestamp)
			.one(conn)
			.await?;

		Ok(record)
	}

	// TODO(graphql): object type to load job details
	/// Get the full history of scan jobs for this library.
	async fn scan_history(
		&self,
		ctx: &Context<'_>,
	) -> Result<Vec<library_scan_record::Model>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let records = library_scan_record::Entity::find()
			.filter(library_scan_record::Column::LibraryId.eq(self.model.id.clone()))
			.order_by_desc(library_scan_record::Column::Timestamp)
			.all(conn)
			.await?;

		Ok(records)
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

	async fn stats(
		&self,
		ctx: &Context<'_>,
		all_users: Option<bool>,
	) -> Result<LibraryStats> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
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

	async fn tags(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let tags = tag::Entity::find()
			.filter(
				tag::Column::Id.in_subquery(
					Query::select()
						.column(library_to_tag::Column::TagId)
						.from(library_to_tag::Entity)
						.and_where(
							library_to_tag::Column::LibraryId.eq(self.model.id.clone()),
						)
						.to_owned(),
				),
			)
			.all(conn)
			.await?;

		Ok(tags.into_iter().map(|t| t.name).collect())
	}
}

#[derive(Debug, FromQueryResult, SimpleObject)]
pub struct LibraryStats {
	series_count: u32,
	book_count: u32,
	total_bytes: u32,
	completed_books: u32,
	in_progress_books: u32,
}
