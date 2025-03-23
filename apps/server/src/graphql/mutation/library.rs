use async_graphql::{Context, Object, Result, SimpleObject, ID};
use graphql::{
	data::{CoreContext, RequestContext},
	guard::PermissionGuard,
	input::CreateLibraryInput,
	object::library::Library,
};
use models::{
	entity::{library, library_config, library_to_tag, media, series, tag},
	shared::enums::{FileStatus, UserPermission},
};
use sea_orm::{prelude::*, sea_query::Query, Condition, Set, TransactionTrait};
use stump_core::filesystem::{image::remove_thumbnails, scanner::LibraryScanJob};
use tokio::fs;

#[derive(Default, SimpleObject)]
struct CleanLibraryResponse {
	deleted_media_count: usize,
	deleted_series_count: usize,
	is_empty: bool,
}

#[derive(Default)]
pub struct LibraryMutation;

#[Object]
impl LibraryMutation {
	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageLibrary)")]
	async fn clean_library(
		&self,
		ctx: &Context<'_>,
		id: ID,
	) -> Result<CleanLibraryResponse> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let core = ctx.data::<CoreContext>()?;

		let _library = library::Entity::find_for_user(user)
			.filter(library::Column::Id.eq(id.to_string()))
			.into_model::<library::LibraryIdentSelect>()
			.one(core.conn.as_ref())
			.await?
			.ok_or("Library not found")?;

		let thumbnails_dir = core.config.get_thumbnails_dir();

		let txn = core.conn.as_ref().begin().await?;

		let deleted_media_ids = media::Entity::delete_many()
			.filter(
				media::Column::Status.ne(FileStatus::Ready.to_string()).and(
					media::Column::SeriesId.in_subquery(
						Query::select()
							.column(series::Column::Id)
							.from(series::Entity)
							.and_where(series::Column::LibraryId.eq(id.to_string()))
							.to_owned(),
					),
				),
			)
			.exec_with_returning(&txn)
			.await?
			.into_iter()
			.map(|m| m.id)
			.collect::<Vec<_>>();

		let deleted_series_ids = series::Entity::delete_many()
			.filter(series::Column::LibraryId.eq(id.to_string()))
			.filter(
				Condition::any()
					.add(series::Column::Status.ne(FileStatus::Ready.to_string()))
					// TODO: Double check that this query is correct
					.add(
						series::Column::Id.not_in_subquery(
							Query::select()
								.column(media::Column::SeriesId)
								.distinct()
								.from(media::Entity)
								.to_owned(),
						),
					),
			)
			.exec_with_returning(&txn)
			.await?
			.into_iter()
			.map(|s| s.id)
			.collect::<Vec<_>>();

		let is_library_empty = series::Entity::find()
			.filter(series::Column::LibraryId.eq(id.to_string()))
			.count(&txn)
			.await? == 0;

		txn.commit().await?;

		if !deleted_media_ids.is_empty() {
			if let Err(error) =
				remove_thumbnails(&deleted_media_ids, &thumbnails_dir).await
			{
				tracing::error!(?error, "Failed to remove thumbnails for library media");
			}
		}

		if !deleted_series_ids.is_empty() {
			if let Err(error) =
				remove_thumbnails(&deleted_series_ids, &thumbnails_dir).await
			{
				tracing::error!(?error, "Failed to remove thumbnails for library series");
			}
		}

		Ok(CleanLibraryResponse {
			deleted_media_count: deleted_media_ids.len(),
			deleted_series_count: deleted_series_ids.len(),
			is_empty: is_library_empty,
		})
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::CreateLibrary)")]
	async fn create_library(
		&self,
		ctx: &Context<'_>,
		mut input: CreateLibraryInput,
	) -> Result<Library> {
		let core = ctx.data::<CoreContext>()?;

		match fs::metadata(&input.path).await {
			Ok(metadata) => {
				if !metadata.is_dir() {
					return Err("Path is not a directory".into());
				}
			},
			Err(error) => {
				return Err(error.to_string().into());
			},
		}

		let child_libraries = library::Entity::find()
			.filter(library::Column::Path.starts_with(input.path.clone()))
			.count(core.conn.as_ref())
			.await?;

		if child_libraries > 0 {
			return Err("Path is a parent of another library on the filesystem".into());
		}

		let scan_after_creation = input.scan_on_create;
		let tags = input.tags.take();

		let txn = core.conn.as_ref().begin().await?;

		let (library, config) = input.into_active_model();

		let created_config = config.insert(&txn).await?;
		let created_library = library::Entity::insert(library::ActiveModel {
			id: Set(created_config
				.library_id
				.ok_or("Library config not created correctly")?),
			..library
		})
		.exec_with_returning(&txn)
		.await?;

		if let Some(tags) = tags {
			let existing_tags = tag::Entity::find()
				.filter(tag::Column::Name.is_in(tags.clone()))
				.all(&txn)
				.await?;

			let tags_to_create = tags
				.iter()
				.filter(|tag| !existing_tags.iter().any(|t| t.name == **tag))
				.map(|tag| tag::ActiveModel {
					name: Set(tag.clone()),
					..Default::default()
				})
				.collect::<Vec<_>>();

			let created_tags = tag::Entity::insert_many(tags_to_create)
				.exec_with_returning_many(&txn)
				.await?;

			let to_link = existing_tags
				.iter()
				.chain(created_tags.iter())
				.map(|tag| tag.id.clone())
				.collect::<Vec<_>>();

			library_to_tag::Entity::insert_many(
				to_link
					.into_iter()
					.map(|tag_id| library_to_tag::ActiveModel {
						library_id: Set(created_library.id.clone()),
						tag_id: Set(tag_id),
						..Default::default()
					})
					.collect::<Vec<library_to_tag::ActiveModel>>(),
			)
			.on_conflict_do_nothing()
			.exec(&txn)
			.await?;
		}

		txn.commit().await?;

		if scan_after_creation {
			core.enqueue_job(LibraryScanJob::new(
				created_library.id.clone(),
				created_library.path.clone(),
				None,
			))?;
		}

		Ok(Library::from(created_library))
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::ScanLibrary)")]
	async fn scan_library(&self, ctx: &Context<'_>, id: ID) -> Result<bool> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let core = ctx.data::<CoreContext>()?;

		let library = library::Entity::find_for_user(user)
			.filter(library::Column::Id.eq(id.to_string()))
			.into_model::<library::LibraryIdentSelect>()
			.one(core.conn.as_ref())
			.await?
			.ok_or("Library not found")?;

		// TODO(graphql): ScanOptions
		core.enqueue_job(LibraryScanJob::new(library.id, library.path, None))?;
		tracing::debug!("Enqueued library scan job");

		Ok(true)
	}
}
