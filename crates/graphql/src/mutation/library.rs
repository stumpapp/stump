use async_graphql::{Context, Json, Object, Result, SimpleObject, ID};
use chrono::Utc;
use models::{
	entity::{
		last_library_visit, library, library_config, library_hidden_to_user,
		library_scan_record, library_to_tag, media, series, tag, user,
	},
	shared::enums::{FileStatus, UserPermission},
};
use sea_orm::{
	prelude::*,
	sea_query::{OnConflict, Query},
	Condition, QuerySelect, Set, TransactionTrait,
};
use stump_core::filesystem::{
	image::remove_thumbnails,
	scanner::{LibraryScanJob, ScanOptions},
};
use tokio::fs;

use crate::{
	data::{CoreContext, RequestContext},
	error_message,
	guard::PermissionGuard,
	input::CreateOrUpdateLibraryInput,
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
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
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

	/// Create a new library with the provided configuration. If `scan_after_persist` is `true`,
	/// the library will be scanned immediately after creation.
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

		let (library, config) = input.into_active_model();

		let created_config = config.insert(&txn).await?;
		let created_library = library::Entity::insert(library::ActiveModel {
			id: Set(created_config
				.library_id
				.ok_or("Library config not created correctly")?),
			config_id: Set(created_config.id),
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

		if add_watcher {
			core.library_watcher
				.add_watcher(created_library.path.clone().into())
				.await?;
		}

		Ok(Library::from(created_library))
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
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
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

		let existing_tags = tag::Entity::find()
			.filter(
				tag::Column::Id.in_subquery(
					Query::select()
						.column(library_to_tag::Column::TagId)
						.from(library_to_tag::Entity)
						.and_where(
							library_to_tag::Column::LibraryId
								.eq(existing_library.id.clone()),
						)
						.to_owned(),
				),
			)
			.all(core.conn.as_ref())
			.await?;

		enforce_valid_library_path(
			core.conn.as_ref(),
			&input.path,
			Some(&existing_library.path),
		)
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
			let tags_not_in_existing = tags
				.iter()
				.filter(|tag| !existing_tags.iter().any(|t| t.name == **tag))
				.collect::<Vec<_>>();

			let tags_to_add_which_already_exist = tag::Entity::find()
				.filter(tag::Column::Name.is_in(tags_not_in_existing.clone()))
				.all(&txn)
				.await?;

			let tags_to_create = tags_not_in_existing
				.iter()
				.filter(|tag| {
					!tags_to_add_which_already_exist
						.iter()
						.any(|t| t.name == ***tag)
				})
				.map(|tag| tag::ActiveModel {
					name: Set(tag.to_string()),
					..Default::default()
				})
				.collect::<Vec<_>>();

			let created_tags = tag::Entity::insert_many(tags_to_create)
				.exec_with_returning_many(&txn)
				.await?;

			let tags_to_connect = tags_to_add_which_already_exist
				.iter()
				.chain(created_tags.iter())
				.map(|tag| tag.id.clone())
				.collect::<Vec<_>>();

			let tags_to_disconnect = existing_tags
				.iter()
				.filter(|tag| !tags.iter().any(|t| t == &tag.name))
				.map(|tag| tag.id.clone())
				.collect::<Vec<_>>();

			if !tags_to_disconnect.is_empty() {
				let affected_rows = library_to_tag::Entity::delete_many()
					.filter(library_to_tag::Column::Id.is_in(tags_to_disconnect).and(
						library_to_tag::Column::LibraryId.eq(updated_library.id.clone()),
					))
					.exec(&txn)
					.await?
					.rows_affected;
				tracing::debug!(affected_rows, "Deleted tags from library");
			}

			if !tags_to_connect.is_empty() {
				let library_id = updated_library.id.clone();
				let to_link = tags_to_connect
					.into_iter()
					.map(|tag_id| library_to_tag::ActiveModel {
						library_id: Set(library_id.clone()),
						tag_id: Set(tag_id),
						..Default::default()
					})
					.collect::<Vec<library_to_tag::ActiveModel>>();

				library_to_tag::Entity::insert_many(to_link)
					.on_conflict_do_nothing()
					.exec(&txn)
					.await?;
			}
		}

		txn.commit().await?;

		if scan_after_update {
			core.enqueue_job(LibraryScanJob::new(
				updated_library.id.clone(),
				updated_library.path.clone(),
				None,
			))?;
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

	// TODO(graphql): (thumbnail API remains RESTful). This serves as a reminder, it won't live here

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
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
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

		let existing_exclusions = library_hidden_to_user::Entity::find()
			.filter(library_hidden_to_user::Column::LibraryId.eq(library.id.clone()))
			.all(core.conn.as_ref())
			.await?;

		let to_add = user_ids
			.iter()
			.filter(|id| {
				!existing_exclusions
					.iter()
					.any(|exclusion| exclusion.user_id == **id)
			})
			.map(|id| library_hidden_to_user::ActiveModel {
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
			library_hidden_to_user::Entity::insert_many(to_add)
				.on_conflict_do_nothing()
				.exec(&txn)
				.await?;
		}

		if !to_remove.is_empty() {
			library_hidden_to_user::Entity::delete_many()
				.filter(library_hidden_to_user::Column::Id.is_in(to_remove))
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
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
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
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
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

	/// Enqueue a scan job for a library. This will index the filesystem from the library's root path
	/// and update the database accordingly.
	#[graphql(guard = "PermissionGuard::one(UserPermission::ScanLibrary)")]
	async fn scan_library(
		&self,
		ctx: &Context<'_>,
		id: ID,
		// TODO(graphql): Investigate not using a JSON wrapper for this. async_graphql doesn't support
		// non-unit enums, so it might just be a limitation. It does degrate the DX a bit missing
		// out on the types.
		option: Option<Json<ScanOptions>>,
	) -> Result<bool> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let core = ctx.data::<CoreContext>()?;

		let library = library::Entity::find_for_user(user)
			.filter(library::Column::Id.eq(id.to_string()))
			.into_model::<library::LibraryIdentSelect>()
			.one(core.conn.as_ref())
			.await?
			.ok_or("Library not found")?;

		core.enqueue_job(LibraryScanJob::new(
			library.id,
			library.path,
			option.map(|o| o.0),
		))?;
		tracing::debug!("Enqueued library scan job");

		Ok(true)
	}

	/// "Visit" a library, which will upsert a record of the user's last visit to the library.
	/// This is used to inform the UI of the last library which was visited by the user
	async fn visit_library(&self, ctx: &Context<'_>, id: ID) -> Result<Library> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
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

	let child_libraries = library::Entity::find()
		.filter(library::Column::Path.starts_with(path))
		.count(conn)
		.await?;

	if child_libraries > 0 {
		return Err("Path is a parent of another library on the filesystem".into());
	}

	Ok(())
}
