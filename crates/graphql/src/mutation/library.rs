use async_graphql::{Context, Json, Object, Result, SimpleObject, ID};
use chrono::Utc;
use itertools::chain;
use metadata_integrations::MetadataField;
use models::{
	entity::{
		last_library_visit,
		library::{self, LibraryIdentSelect},
		library_config, library_exclusion, library_scan_record, library_tag, media,
		media_metadata, metadata_provider_config, series, series_metadata, tag, user,
	},
	shared::enums::{FileStatus, MetadataResetImpact, UserPermission},
};
use sea_orm::{
	prelude::*,
	sea_query::{OnConflict, Query},
	Condition, IntoActiveModel, QuerySelect, Set, TransactionTrait,
};
use stump_core::filesystem::{
	image::{
		generate_book_thumbnail, remove_thumbnails, GenerateThumbnailOptions,
		ImageProcessorOptionsExt, PlaceholderGenerationJobConfig,
		PlaceholderGenerationJobScope, ThumbnailGenerationJobParams,
	},
	media::analysis::{AnalysisJobConfig, MediaAnalysisJobScope},
	metadata::{MetadataFetchJobParams, MetadataFetchScope},
	scanner::ScanOptions,
};
use stump_core::job::stump_job::StumpJob;
use tokio::fs;

use crate::{
	data::{AuthContext, CoreContext},
	error_message,
	guard::PermissionGuard,
	input::{library::CreateOrUpdateLibraryInput, thumbnail::UpdateThumbnailInput},
	object::library::Library,
};

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
	async fn analyze_library(
		&self,
		ctx: &Context<'_>,
		id: ID,
		#[graphql(default = false)] force_reanalysis: bool,
	) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let model = library::Entity::find_for_user(user)
			.filter(library::Column::Id.eq(id.to_string()))
			.into_model::<LibraryIdentSelect>()
			.one(conn)
			.await?
			.ok_or("Library not found")?;

		core.enqueue(StumpJob::analyze_media(AnalysisJobConfig {
			force_reanalysis,
			scope: MediaAnalysisJobScope::Library(model.id),
		}))
		.await?;

		Ok(true)
	}

	/// Delete media and series from a library that match one of the following conditions:
	///
	/// - A series that is missing from disk (status is not `Ready`)
	/// - A media that is missing from disk (status is not `Ready`)
	/// - A series that is not associated with any media (i.e., no media in the series)
	///
	/// This operation will also remove any associated thumbnails of the deleted media and series.
	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageLibrary)")]
	async fn clean_library(
		&self,
		ctx: &Context<'_>,
		id: ID,
	) -> Result<CleanLibraryResponse> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;

		// This is primarily for access control assertion
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
		tracing::trace!(?deleted_media_ids, "Deleted media ids");

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
		tracing::trace!(?deleted_series_ids, "Deleted series ids");

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

	/// Clear the scan history for a specific library
	#[graphql(
		guard = "PermissionGuard::new(&[UserPermission::ReadJobs, UserPermission::ManageLibrary])"
	)]
	async fn clear_scan_history(&self, ctx: &Context<'_>, id: ID) -> Result<u64> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;

		// This is primarily for access control assertion
		let library = library::Entity::find_for_user(user)
			.filter(library::Column::Id.eq(id.to_string()))
			.into_model::<library::LibraryIdentSelect>()
			.one(core.conn.as_ref())
			.await?
			.ok_or("Library not found")?;

		let affected_records = library_scan_record::Entity::delete_many()
			.filter(library_scan_record::Column::LibraryId.eq(library.id.clone()))
			.exec(core.conn.as_ref())
			.await?
			.rows_affected;

		Ok(affected_records)
	}

	/// Create a new library with the provided configuration. If `scan_after_persist` is `true`,
	/// the library will be scanned immediately after creation.
	#[tracing::instrument(skip(self, ctx))]
	#[graphql(guard = "PermissionGuard::one(UserPermission::CreateLibrary)")]
	async fn create_library(
		&self,
		ctx: &Context<'_>,
		mut input: CreateOrUpdateLibraryInput,
	) -> Result<Library> {
		let core = ctx.data::<CoreContext>()?;

		enforce_valid_library_path(core.conn.as_ref(), &input.path, None).await?;

		let scan_after_creation = input.scan_after_persist;
		let add_watcher = input.config.as_ref().is_some_and(|config| config.watch);
		let tags = input.tags.take();

		let txn = core.conn.as_ref().begin().await?;

		if let Some(thumbnail_config) = input
			.config
			.as_ref()
			.and_then(|c| c.thumbnail_config.as_ref())
		{
			thumbnail_config.validate()?;
		}

		let (library, config) = input.into_active_model();

		let created_config = config.insert(&txn).await?;
		let created_library = library::ActiveModel {
			id: Set(created_config
				.library_id
				.ok_or("Library config not created correctly")?),
			config_id: Set(created_config.id),
			status: Set(FileStatus::Ready),
			..library
		}
		.insert(&txn)
		.await?;

		if let Some(tags) = tags {
			let (to_connect, _) = super::tag::sync_tags(&txn, &tags, &[]).await?;

			if !to_connect.is_empty() {
				library_tag::Entity::insert_many(
					to_connect
						.into_iter()
						.map(|tag_id| library_tag::ActiveModel {
							library_id: Set(created_library.id.clone()),
							tag_id: Set(tag_id),
							..Default::default()
						})
						.collect::<Vec<library_tag::ActiveModel>>(),
				)
				.on_conflict_do_nothing()
				.exec(&txn)
				.await?;
			}
		}

		txn.commit().await?;

		if scan_after_creation {
			core.enqueue(StumpJob::library_scan(
				created_library.id.clone(),
				created_library.path.clone(),
				None,
			))
			.await?;
		}

		if add_watcher {
			core.library_watcher
				.add_watcher(created_library.path.clone().into())
				.await?;
		}

		Ok(Library::from(created_library))
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::EditMetadata)")]
	async fn reset_library_metadata(
		&self,
		ctx: &Context<'_>,
		id: ID,
		impact: MetadataResetImpact,
	) -> Result<Library> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let library = library::Entity::find_for_user(user)
			.filter(library::Column::Id.eq(id.to_string()))
			.one(conn)
			.await?
			.ok_or("Library not found")?;

		let tx = conn.begin().await?;

		let series_ids: Vec<String> = series::Entity::find()
			.select_only()
			.column(series::Column::Id)
			.filter(series::Column::LibraryId.eq(library.id.clone()))
			.into_tuple()
			.all(&tx)
			.await?;

		if matches!(
			impact,
			MetadataResetImpact::Series | MetadataResetImpact::Everything
		) {
			let metadata_models = series_metadata::Entity::find()
				.filter(series_metadata::Column::SeriesId.is_in(series_ids.clone()))
				.all(&tx)
				.await?;
			tracing::trace!(
				count = metadata_models.len(),
				"Found series metadata to delete"
			);

			for metadata in metadata_models {
				metadata.delete(&tx).await?;
			}
		}

		if matches!(
			impact,
			MetadataResetImpact::Books | MetadataResetImpact::Everything
		) {
			let media_metadata_models = media_metadata::Entity::find()
				.filter(
					media_metadata::Column::MediaId.in_subquery(
						Query::select()
							.column(media::Column::Id)
							.from(media::Entity)
							.and_where(media::Column::SeriesId.is_in(series_ids))
							.to_owned(),
					),
				)
				.all(&tx)
				.await?;
			tracing::trace!(
				count = media_metadata_models.len(),
				"Found media metadata to delete"
			);

			for media_metadata in media_metadata_models {
				media_metadata.delete(&tx).await?;
			}
		}

		tx.commit().await?;

		tracing::debug!(?impact, library_id = ?library.id, "Reset metadata for library");

		Ok(library.into())
	}

	/// Update an existing library with the provided configuration. If `scan_after_persist` is `true`,
	/// the library will be scanned immediately after updating.
	#[graphql(guard = "PermissionGuard::one(UserPermission::EditLibrary)")]
	async fn update_library(
		&self,
		ctx: &Context<'_>,
		id: ID,
		mut input: CreateOrUpdateLibraryInput,
	) -> Result<Library> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;

		let (existing_library, existing_config) = library::Entity::find_for_user(user)
			.filter(library::Column::Id.eq(id.to_string()))
			.find_also_related(library_config::Entity)
			.one(core.conn.as_ref())
			.await?
			.ok_or("Library not found")?;

		let Some(existing_config) = existing_config else {
			return Err("Library is missing associated config!".into());
		};

		enforce_valid_library_path(
			core.conn.as_ref(),
			&input.path,
			Some(&existing_library.path),
		)
		.await?;

		let existing_tags = tag::Entity::find()
			.filter(
				tag::Column::Id.in_subquery(
					Query::select()
						.column(library_tag::Column::TagId)
						.from(library_tag::Entity)
						.and_where(
							library_tag::Column::LibraryId
								.eq(existing_library.id.clone()),
						)
						.to_owned(),
				),
			)
			.all(core.conn.as_ref())
			.await?;

		let scan_after_update = input.scan_after_persist;
		let add_watcher = input.config.as_ref().is_some_and(|config| config.watch);
		let tags = input.tags.take();

		let txn = core.conn.as_ref().begin().await?;

		let (library, config) = input.into_active_model();

		let _updated_config = library_config::ActiveModel {
			id: Set(existing_config.id),
			library_id: Set(existing_config.library_id.clone()),
			..config
		}
		.update(&txn)
		.await?;

		let updated_library = library::ActiveModel {
			id: Set(existing_library.id),
			..library
		}
		.update(&txn)
		.await?;

		if let Some(tags) = tags {
			let (to_connect, to_disconnect) =
				super::tag::sync_tags(&txn, &tags, &existing_tags).await?;

			if !to_disconnect.is_empty() {
				library_tag::Entity::delete_many()
					.filter(library_tag::Column::TagId.is_in(to_disconnect).and(
						library_tag::Column::LibraryId.eq(updated_library.id.clone()),
					))
					.exec(&txn)
					.await?;
			}

			if !to_connect.is_empty() {
				let library_id = updated_library.id.clone();
				library_tag::Entity::insert_many(
					to_connect
						.into_iter()
						.map(|tag_id| library_tag::ActiveModel {
							library_id: Set(library_id.clone()),
							tag_id: Set(tag_id),
							..Default::default()
						})
						.collect::<Vec<library_tag::ActiveModel>>(),
				)
				.on_conflict_do_nothing()
				.exec(&txn)
				.await?;
			}
		}

		txn.commit().await?;

		if scan_after_update {
			core.enqueue(StumpJob::library_scan(
				updated_library.id.clone(),
				updated_library.path.clone(),
				None,
			))
			.await?;
		}

		if add_watcher {
			core.library_watcher
				.add_watcher(updated_library.path.clone().into())
				.await?;
		} else {
			core.library_watcher
				.remove_watcher(existing_library.path.clone().into())
				.await?;
		}

		Ok(Library::from(updated_library))
	}

	/// Update the emoji for a library
	#[graphql(guard = "PermissionGuard::new(&[UserPermission::EditLibrary])")]
	async fn update_library_emoji(
		&self,
		ctx: &Context<'_>,
		id: ID,
		emoji: Option<String>,
	) -> Result<Library> {
		let core = ctx.data::<CoreContext>()?;
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;

		let existing_library = library::Entity::find_for_user(user)
			.filter(library::Column::Id.eq(id.to_string()))
			.one(core.conn.as_ref())
			.await?
			.ok_or("Library not found")?;

		let mut active_model = existing_library.into_active_model();
		active_model.emoji = Set(emoji);
		let updated_library = active_model.update(core.conn.as_ref()).await?;
		Ok(updated_library.into())
	}

	/// Update the thumbnail for a library. This will replace the existing thumbnail with the the one
	/// associated with the provided input (book). If the book does not have a thumbnail, one
	/// will be generated based on the library's thumbnail configuration.
	#[graphql(
		guard = "PermissionGuard::new(&[UserPermission::EditLibrary, UserPermission::EditThumbnails])"
	)]
	async fn update_library_thumbnail(
		&self,
		ctx: &Context<'_>,
		id: ID,
		input: UpdateThumbnailInput,
	) -> Result<Library> {
		let core = ctx.data::<CoreContext>()?;
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;

		let (library, config) = library::Entity::find_for_user(user)
			.filter(library::Column::Id.eq(id.to_string()))
			.find_also_related(library_config::Entity)
			.one(core.conn.as_ref())
			.await?
			.ok_or("Library not found")?;

		let page = input.params.page();

		let book = media::Entity::find_for_user(user)
			.filter(media::Column::Id.eq(input.media_id))
			.one(core.conn.as_ref())
			.await?
			.ok_or("Book not found")?;

		if book.extension == "epub" && page > 1 {
			return Err("Cannot set thumbnail from EPUB chapter".into());
		}

		let image_options = config
			.ok_or("Library config not found")?
			.thumbnail_config
			.unwrap_or_default()
			.with_page(page);

		let (_, path_buf, _) = generate_book_thumbnail(
			&book.into(),
			core.conn.as_ref(),
			GenerateThumbnailOptions {
				image_options,
				core_config: core.config.as_ref().clone(),
				force_regen: true,
				filename: Some(id.to_string()),
			},
		)
		.await?;
		tracing::debug!(path = ?path_buf, "Generated library thumbnail");

		Ok(library.into())
	}

	/// Exclude users from a library, preventing them from seeing the library in the UI. This operates as a
	/// full replacement of the excluded users list, so any users not included in the provided list will be
	/// removed from the exclusion list if they were previously excluded.
	///
	/// The server owner cannot be excluded from a library, nor can the user performing the action exclude
	/// themselves.
	#[graphql(
		guard = "PermissionGuard::new(&[UserPermission::ManageLibrary, UserPermission::ReadUsers])"
	)]
	async fn update_library_excluded_users(
		&self,
		ctx: &Context<'_>,
		id: ID,
		user_ids: Vec<String>,
	) -> Result<Library> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;

		if user_ids.contains(&user.id) {
			return Err("Cannot exclude self from library".into());
		}

		let server_owner_id = if user.is_server_owner {
			user.id.clone()
		} else {
			user::Entity::find()
				.select_only()
				.columns(vec![user::Column::Id, user::Column::Username])
				.filter(user::Column::IsServerOwner.eq(true))
				.into_model::<user::UserIdentSelect>()
				.one(core.conn.as_ref())
				.await?
				.ok_or("Server owner not found")?
				.id
		};

		if user_ids.contains(&server_owner_id) {
			tracing::error!(?user, library = ?id, "Attempted to exclude server owner from library");
			return Err(error_message::FORBIDDEN_ACTION.into());
		}

		let library = library::Entity::find_for_user(user)
			.filter(library::Column::Id.eq(id.to_string()))
			.one(core.conn.as_ref())
			.await?
			.ok_or("Library not found")?;

		let existing_exclusions = library_exclusion::Entity::find()
			.filter(library_exclusion::Column::LibraryId.eq(library.id.clone()))
			.all(core.conn.as_ref())
			.await?;

		let to_add = user_ids
			.iter()
			.filter(|id| {
				!existing_exclusions
					.iter()
					.any(|exclusion| exclusion.user_id == **id)
			})
			.map(|id| library_exclusion::ActiveModel {
				library_id: Set(library.id.clone()),
				user_id: Set(id.clone()),
				..Default::default()
			})
			.collect::<Vec<_>>();

		let to_remove = existing_exclusions
			.iter()
			.filter(|exclusion| !user_ids.contains(&exclusion.user_id))
			.map(|exclusion| exclusion.id)
			.collect::<Vec<_>>();

		if to_add.is_empty() && to_remove.is_empty() {
			tracing::warn!("No changes to library exclusions");
			return Ok(Library::from(library));
		}

		let txn = core.conn.as_ref().begin().await?;

		if !to_add.is_empty() {
			library_exclusion::Entity::insert_many(to_add)
				.on_conflict_do_nothing()
				.exec(&txn)
				.await?;
		}

		if !to_remove.is_empty() {
			library_exclusion::Entity::delete_many()
				.filter(library_exclusion::Column::Id.is_in(to_remove))
				.exec(&txn)
				.await?;
		}

		txn.commit().await?;

		// Note: We return the full node so the ID may be pulled to properly update the cache.
		Ok(Library::from(library))
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageLibrary)")]
	async fn delete_library_scan_history(
		&self,
		ctx: &Context<'_>,
		id: ID,
	) -> Result<Library> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;

		let library = library::Entity::find_for_user(user)
			.filter(library::Column::Id.eq(id.to_string()))
			.one(core.conn.as_ref())
			.await?
			.ok_or("Library not found")?;

		library_scan_record::Entity::delete_many()
			.filter(library_scan_record::Column::LibraryId.eq(library.id.clone()))
			.exec(core.conn.as_ref())
			.await?;

		// Note: We return the full node so the ID may be pulled to properly update the cache.
		Ok(Library::from(library))
	}

	/// Delete a library, including all associated media and series via cascading deletes. This
	/// operation cannot be undone.
	#[graphql(guard = "PermissionGuard::one(UserPermission::DeleteLibrary)")]
	async fn delete_library(&self, ctx: &Context<'_>, id: ID) -> Result<Library> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;

		let library = library::Entity::find_for_user(user)
			.filter(library::Column::Id.eq(id.to_string()))
			.one(core.conn.as_ref())
			.await?
			.ok_or("Library not found")?;
		library.clone().delete(core.conn.as_ref()).await?;

		// TODO: delete thumbnails!

		// Note: We return the full node so the ID may be pulled to properly update the cache.
		// For obvious reasons, certain fields will error if accessed.
		Ok(Library::from(library))
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageLibrary)")]
	async fn generate_library_thumbnails(
		&self,
		ctx: &Context<'_>,
		id: ID,
		#[graphql(default = false)] force_regenerate: bool,
	) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;

		let (library, config) = library::Entity::find_for_user(user)
			.filter(library::Column::Id.eq(id.to_string()))
			.find_also_related(library_config::Entity)
			.one(core.conn.as_ref())
			.await?
			.ok_or("Library not found")?;
		let config = config.ok_or("Library config not found")?;

		if let Err(error) = core
			.enqueue(StumpJob::thumbnail_generation(
				config.thumbnail_config.unwrap_or_default(),
				ThumbnailGenerationJobParams::books_in_library(
					library.id,
					force_regenerate,
				),
			))
			.await
		{
			tracing::error!(?error, "Failed to enqueue thumbnail generation job");
			return Err(error.into());
		}

		Ok(true)
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageLibrary)")]
	async fn process_library_thumbnails(
		&self,
		ctx: &Context<'_>,
		id: ID,
		#[graphql(default = false)] force_regenerate: bool,
	) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;

		let library = library::Entity::find_for_user(user)
			.filter(library::Column::Id.eq(id.to_string()))
			.one(core.conn.as_ref())
			.await?
			.ok_or("Library not found")?;

		if let Err(error) = core
			.enqueue(StumpJob::placeholder_generation(
				PlaceholderGenerationJobConfig {
					scope: PlaceholderGenerationJobScope::BooksInLibrary(
						library.id.clone(),
					),
					force_regenerate,
				},
			))
			.await
		{
			tracing::error!(?error, "Failed to enqueue placeholder generation job");
			return Err(error.into());
		}

		Ok(true)
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageLibrary)")]
	async fn delete_library_thumbnails(&self, ctx: &Context<'_>, id: ID) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;

		let library = library::Entity::find_for_user(user)
			.select_only()
			.columns(LibraryIdentSelect::columns())
			.filter(library::Column::Id.eq(id.to_string()))
			.into_model::<library::LibraryIdentSelect>()
			.one(core.conn.as_ref())
			.await?
			.ok_or("Library not found")?;

		let series = series::Entity::find_for_user(user)
			.filter(series::Column::LibraryId.eq(library.id.clone()))
			.select_only()
			.columns(series::SeriesIdentSelect::columns())
			.into_model::<series::SeriesIdentSelect>()
			.all(core.conn.as_ref())
			.await?;

		let books = media::Entity::find()
			.filter(
				media::Column::SeriesId
					.is_in(series.iter().map(|s| s.id.clone()).collect::<Vec<_>>()),
			)
			.select_only()
			.columns(media::MediaIdentSelect::columns())
			.into_model::<media::MediaIdentSelect>()
			.all(core.conn.as_ref())
			.await?;

		let ids = chain(
			[library.id],
			series
				.iter()
				.map(|s| s.id.clone())
				.chain(books.iter().map(|b| b.id.clone())),
		)
		.collect::<Vec<_>>();

		let thumbnails_dir = core.config.get_thumbnails_dir();
		if let Err(error) = remove_thumbnails(&ids, &thumbnails_dir).await {
			tracing::error!(?error, "Failed to remove library thumbnails");
			return Err(error.into());
		}

		Ok(true)
	}

	/// Start a job which will search external metadata providers
	#[graphql(guard = "PermissionGuard::one(UserPermission::MetadataFetchRecordManage)")]
	#[tracing::instrument(skip(self, ctx))]
	async fn fetch_library_metadata(
		&self,
		ctx: &Context<'_>,
		id: ID,
		#[graphql(default = false)] force_refetch: bool,
	) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;

		let (library, config) = library::Entity::find_for_user(user)
			.filter(library::Column::Id.eq(id.to_string()))
			.find_also_related(library_config::Entity)
			.one(core.conn.as_ref())
			.await?
			.ok_or("Library not found")?;

		let library_type = config.ok_or("Library config not found")?.library_type;

		let has_relevant_provider = metadata_provider_config::Entity::find()
			.filter(metadata_provider_config::Column::Enabled.eq(true))
			.all(core.conn.as_ref())
			.await
			.unwrap_or_default()
			.into_iter()
			.any(|config| library_type.has_provider_overlap(&config.provider_type));

		if !has_relevant_provider {
			tracing::debug!(
				?library_type,
				"No compatible metadata providers for this library type"
			);
			return Ok(false);
		}

		core.enqueue(StumpJob::metadata_fetch(MetadataFetchJobParams {
			force_refetch,
			scope: MetadataFetchScope::MediaInLibrary(library.id),
		}))
		.await?;
		tracing::debug!("Enqueued library metadata fetch job");

		Ok(true)
	}

	/// Bulk-set locked metadata fields for all series metadata in a library
	#[graphql(guard = "PermissionGuard::one(UserPermission::EditMetadata)")]
	async fn set_library_series_locked_fields(
		&self,
		ctx: &Context<'_>,
		library_id: ID,
		locked_fields: Vec<MetadataField>,
	) -> Result<u64> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let library = library::Entity::find_for_user(user)
			.filter(library::Column::Id.eq(library_id.to_string()))
			.one(conn)
			.await?
			.ok_or("Library not found")?;

		let locked_json = serde_json::to_value(&locked_fields)?;
		let library_id_str = library.id.clone();

		let series_ids: Vec<String> = series::Entity::find()
			.filter(series::Column::LibraryId.eq(&library_id_str))
			.select_only()
			.column(series::Column::Id)
			.into_tuple()
			.all(conn)
			.await?;

		if series_ids.is_empty() {
			return Ok(0);
		}

		let result = series_metadata::Entity::update_many()
			.col_expr(
				series_metadata::Column::LockedFields,
				sea_orm::sea_query::Expr::value(locked_json.to_string()),
			)
			.filter(series_metadata::Column::SeriesId.is_in(series_ids))
			.exec(conn)
			.await?;

		tracing::debug!(
			library_id = ?library_id_str,
			?locked_fields,
			updated = result.rows_affected,
			"Set locked fields for series metadata in library"
		);

		Ok(result.rows_affected)
	}

	/// Bulk-set locked metadata fields for all media metadata in a library
	#[graphql(guard = "PermissionGuard::one(UserPermission::EditMetadata)")]
	async fn set_library_media_locked_fields(
		&self,
		ctx: &Context<'_>,
		library_id: ID,
		locked_fields: Vec<MetadataField>,
	) -> Result<u64> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let library = library::Entity::find_for_user(user)
			.filter(library::Column::Id.eq(library_id.to_string()))
			.one(conn)
			.await?
			.ok_or("Library not found")?;

		let locked_json = serde_json::to_value(&locked_fields)?;
		let library_id_str = library.id.clone();

		let media_ids: Vec<String> = media::Entity::find()
			.filter(
				media::Column::SeriesId.in_subquery(
					Query::select()
						.column(series::Column::Id)
						.from(series::Entity)
						.and_where(series::Column::LibraryId.eq(&library_id_str))
						.to_owned(),
				),
			)
			.select_only()
			.column(media::Column::Id)
			.into_tuple()
			.all(conn)
			.await?;

		if media_ids.is_empty() {
			return Ok(0);
		}

		let result = media_metadata::Entity::update_many()
			.col_expr(
				media_metadata::Column::LockedFields,
				sea_orm::sea_query::Expr::value(locked_json.to_string()),
			)
			.filter(media_metadata::Column::MediaId.is_in(media_ids))
			.exec(conn)
			.await?;

		tracing::debug!(
			library_id = ?library_id_str,
			?locked_fields,
			updated = result.rows_affected,
			"Set locked fields for media metadata in library"
		);

		Ok(result.rows_affected)
	}

	/// Enqueue a scan job for a library. This will index the filesystem from the library's root path
	/// and update the database accordingly.
	#[graphql(guard = "PermissionGuard::one(UserPermission::ScanLibrary)")]
	async fn scan_library(
		&self,
		ctx: &Context<'_>,
		id: ID,
		options: Option<Json<ScanOptions>>,
	) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;

		let library = library::Entity::find_for_user(user)
			.filter(library::Column::Id.eq(id.to_string()))
			.into_model::<library::LibraryIdentSelect>()
			.one(core.conn.as_ref())
			.await?
			.ok_or("Library not found")?;

		core.enqueue(StumpJob::library_scan(
			library.id,
			library.path,
			options.map(|o| o.0),
		))
		.await?;
		tracing::debug!("Enqueued library scan job");

		Ok(true)
	}

	/// "Visit" a library, which will upsert a record of the user's last visit to the library.
	/// This is used to inform the UI of the last library which was visited by the user
	async fn visit_library(&self, ctx: &Context<'_>, id: ID) -> Result<Library> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;

		let library = library::Entity::find_for_user(user)
			.filter(library::Column::Id.eq(id.to_string()))
			.one(core.conn.as_ref())
			.await?
			.ok_or("Library not found")?;

		let active_model = last_library_visit::ActiveModel {
			library_id: Set(library.id.clone()),
			user_id: Set(user.id.clone()),
			timestamp: Set(Utc::now().into()),
			..Default::default()
		};

		last_library_visit::Entity::insert(active_model)
			.on_conflict(
				OnConflict::new()
					.update_column(last_library_visit::Column::Timestamp)
					.to_owned(),
			)
			.exec(core.conn.as_ref())
			.await?;

		Ok(Library::from(library))
	}
}

///  Normalises a path by removing trailing slashes
fn normalize_path(path: &str) -> &str {
	let trimmed = path.trim_end_matches(['/', '\\']);
	if trimmed.is_empty() || path == "/" {
		"/"
	} else {
		trimmed
	}
}
/// Adds a single trailing slash to a path
fn add_trailing_slash(path: &str) -> String {
	if path.contains('/') {
		if path.ends_with('/') {
			path.to_string()
		} else {
			format!("{}/", path)
		}
	} else {
		format!("{}\\", path)
	}
}
/// A helper function to enforce that a library path is valid and does not conflict with
/// other libraries.
async fn enforce_valid_library_path(
	conn: &DatabaseConnection,
	path: &str,
	existing_path: Option<&str>,
) -> Result<()> {
	// TODO: Move this to the core, Ideally we avoid pulling tokio for this crate
	match fs::metadata(path).await {
		Ok(metadata) => {
			if !metadata.is_dir() {
				return Err("Path is not a directory".into());
			}
		},
		Err(error) => {
			return Err(error.to_string().into());
		},
	}

	if let Some(existing_path) = existing_path {
		if existing_path == path {
			return Ok(());
		}
	}

	// example: new_path = "/books", existing_library = "/books/fiction"
	// check if any libraries start with "/books/" (can't use "/books" else it flags e.g. "/books2")
	let mut child_query = library::Entity::find().filter(
		library::Column::Path.starts_with(add_trailing_slash(normalize_path(path))),
	);

	if let Some(existing_path) = existing_path {
		child_query =
			child_query.filter(library::Column::Path.ne(normalize_path(existing_path)));
	}

	let child_libraries_count = child_query.count(conn).await?;

	if child_libraries_count > 0 {
		return Err("Path is a parent of another library on the filesystem".into());
	}

	// example: new_path = "/data/books/fiction", existing_library = "/data/books"
	// check if new_path matches the pattern "/data/books/_%".
	let values: [sea_orm::Value; 1] = [path.into()];
	let mut parent_query = library::Entity::find()
		.filter(Expr::cust_with_values("? LIKE path || '/_%'", values));

	if let Some(existing_path) = existing_path {
		parent_query = parent_query.filter(library::Column::Path.ne(existing_path));
	}

	let parent_libraries_count = parent_query.count(conn).await?;

	if parent_libraries_count > 0 {
		return Err("Path is a child of another library on the filesystem".into());
	}

	Ok(())
}
