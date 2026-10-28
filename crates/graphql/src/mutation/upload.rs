use std::{
	io::{BufReader, Read, Seek},
	path::{Path, PathBuf},
};

use async_graphql::{
	Context, Error, InputObject, Object, Result, Upload, UploadValue, ID,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use models::{
	entity::{library, library_config, media, series},
	shared::enums::UserPermission,
};
use sea_orm::{prelude::*, sea_query::Query, IntoActiveModel, Set};
use stump_core::{
	fs_utils::ContentType,
	image::{
		bump_media_thumbnail_fallbacks, bump_series_thumbnail_fallbacks, place_thumbnail,
		remove_thumbnails, PlaceholderGenerationJobConfig, PlaceholderGenerationJobScope,
	},
	job::StumpJob,
};
use tokio::fs;
use zip::{read::ZipFile, ZipArchive};

use crate::{
	data::{AuthContext, CoreContext},
	guard::{OptionalFeature, OptionalFeatureGuard, PermissionGuard},
	object::{library::Library, media::Media, series::Series},
};

#[derive(Default)]
pub struct UploadMutation;

#[derive(InputObject)]
struct UploadBooksInput {
	library_id: String,
	place_at: String,
	uploads: Vec<Upload>,
}

#[derive(InputObject)]
struct UploadSeriesInput {
	library_id: String,
	place_at: String,
	series_dir_name: String,
	upload: Upload,
}

#[Object]
impl UploadMutation {
	#[graphql(
		guard = "OptionalFeatureGuard::new(OptionalFeature::Upload).and(PermissionGuard::new(&[UserPermission::UploadFile, UserPermission::ManageLibrary]))"
	)]
	async fn upload_books(
		&self,
		ctx: &Context<'_>,
		input: UploadBooksInput,
	) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data()?;
		let UploadBooksInput {
			library_id,
			place_at,
			uploads,
		} = input;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let library = library::Entity::find_for_user(user)
			.filter(library::Column::Id.eq(library_id))
			.one(conn)
			.await?
			.ok_or("Library not found")?;

		// Validate and path that uploads will be placed at, account for possible full path
		let placement_path = get_books_path(&place_at, &library)?;

		// Check that it is a directory and already exists
		if !fs::metadata(&placement_path).await?.is_dir() {
			return Err("Upload path is not a directory".into());
		}

		for upload in uploads {
			let mut value = upload.value(ctx)?;
			validate_book_file(&mut value)?;

			let file_name = value.filename.clone();
			validate_upload_filename(&file_name)?;

			let file_path = placement_path.join(file_name);

			copy_tempfile_to_location(value, &file_path).await?;
		}

		core.enqueue(StumpJob::library_scan(library.id, library.path, None))
			.await
			.map_err(|e| {
				tracing::error!(?e, "Failed to enqueue library scan job");
				"Failed to enqueue library scan job".to_string()
			})?;

		Ok(true)
	}

	#[graphql(
		guard = "OptionalFeatureGuard::new(OptionalFeature::Upload).and(PermissionGuard::new(&[UserPermission::UploadFile, UserPermission::ManageLibrary]))"
	)]
	async fn upload_series(
		&self,
		ctx: &Context<'_>,
		input: UploadSeriesInput,
	) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data()?;
		let UploadSeriesInput {
			library_id,
			place_at,
			series_dir_name,
			upload,
		} = input;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let mut value = upload.value(ctx)?;
		validate_series_upload(&value)?;

		let library = library::Entity::find_for_user(user)
			.filter(library::Column::Id.eq(library_id))
			.one(conn)
			.await?
			.ok_or("Library not found")?;

		// Validate the placement path parameters, error otherwise
		// Validate the placement path parameters and create the full path, error otherwise
		let placement_path = get_series_path(&place_at, &series_dir_name, &library)?;

		// Validate the contents of the zip file
		validate_series_upload_contents(&mut value, &placement_path, false)?;

		// Create directory if necessary
		if let Err(e) = fs::metadata(&placement_path).await {
			if e.kind() == tokio::io::ErrorKind::NotFound {
				fs::create_dir_all(&placement_path).await?;
			} else {
				return Err(
					format!("Error accessing directory {placement_path:?}: {e}").into()
				);
			}
		}

		let temp_file = value.content;
		tokio::task::block_in_place(|| {
			let mut zip_archive = ZipArchive::new(temp_file)
				.map_err(|_| "Error opening zip archive".to_string())?;
			zip_archive
				.extract(placement_path)
				.map_err(|_| "Error unpacking zip archive".to_string())?;
			Ok::<(), Error>(())
		})?;

		core.enqueue(StumpJob::library_scan(library.id, library.path, None))
			.await
			.map_err(|e| {
				tracing::error!(?e, "Failed to enqueue library scan job");
				"Failed to enqueue library scan job".to_string()
			})?;

		Ok(true)
	}

	// TODO(graphql): There is a LOT of duplication here, and only subtle differences wrt the queries.
	// I think we can refactor this into some utility function(s) that take the model type and the ID as parameters

	#[graphql(
		guard = "OptionalFeatureGuard::new(OptionalFeature::Upload).and(PermissionGuard::new(&[UserPermission::UploadFile, UserPermission::EditLibrary, UserPermission::EditThumbnails]))"
	)]
	async fn upload_library_thumbnail(
		&self,
		ctx: &Context<'_>,
		id: ID,
		file: Upload,
	) -> Result<Library> {
		let AuthContext { user, .. } = ctx.data()?;
		let core = ctx.data::<CoreContext>()?;

		let (library, config) = library::Entity::find_for_user(user)
			.filter(library::Column::Id.eq(id.to_string()))
			.find_also_related(library_config::Entity)
			.one(core.conn.as_ref())
			.await?
			.ok_or("Library not found")?;

		let value = file.value(ctx)?;

		enforce_max_size(&value, core.config.max_file_upload_size)?;
		enforce_valid_content_type(&value)?;

		let mut image_buf = Vec::new();
		let mut file = value.content;
		file.read_to_end(&mut image_buf)?;

		let extension = Path::new(&value.filename)
			.extension()
			.and_then(|ext| ext.to_str())
			.map(str::to_ascii_lowercase)
			.ok_or("Expected file to have an extension")?;

		// Note: I chose to *safely* attempt the removal as to not block the upload, however after some
		// user testing I'd like to see if this becomes a problem. We'll see!
		match remove_thumbnails(
			std::slice::from_ref(&library.id),
			&core.config.thumbnails_directory(),
		)
		.await
		{
			Ok(count) => tracing::info!("Removed {} thumbnails!", count),
			Err(e) => tracing::error!(
				?e,
				"Failed to remove existing library thumbnail before replacing!"
			),
		}

		let path_buf =
			place_thumbnail(&library.id, &extension, &image_buf, &core.config).await?;

		tracing::debug!(?path_buf, "Placed library thumbnail");

		let mut active = library.into_active_model();
		active.thumbnail_path = Set(Some(path_buf.to_string_lossy().to_string()));
		let library = active.update(core.conn.as_ref()).await?;

		let config = config.ok_or("Library config not found")?;

		let should_enqueue_placeholder = config.thumbnail_config.is_some()
			|| config.process_thumbnail_colors_even_without_config;

		if !should_enqueue_placeholder {
			tracing::info!(
                "Thumbnail config is not set to process colors without config, skipping placeholder generation"
            );
			return Ok(library.into());
		}

		tracing::debug!(
			"Enqueuing placeholder generation job for uploaded library thumbnail"
		);

		// Note: We do NOT enqueue a thumbnail generation job since that just overwrites the uploaded one lol. Stump will assume your
		// uploaded image is sized accordingly. We DO enqueue a placeholder generation job to ensure the colors etc are updated
		if let Err(e) = core
			.enqueue(StumpJob::PlaceholderGeneration {
				config: PlaceholderGenerationJobConfig {
					force_regenerate: true,
					scope: PlaceholderGenerationJobScope::Libraries(vec![library
						.id
						.clone()]),
				},
			})
			.await
		{
			tracing::error!(?e, "Failed to enqueue placeholder generation job");
		}

		Ok(library.into())
	}

	#[graphql(
		guard = "OptionalFeatureGuard::new(OptionalFeature::Upload).and(PermissionGuard::new(&[UserPermission::UploadFile, UserPermission::EditThumbnails]))"
	)]
	async fn upload_series_thumbnail(
		&self,
		ctx: &Context<'_>,
		id: ID,
		file: Upload,
	) -> Result<Series> {
		let AuthContext { user, .. } = ctx.data()?;
		let core = ctx.data::<CoreContext>()?;

		let mut series = series::ModelWithMetadata::find_for_user(user)
			.filter(series::Column::Id.eq(id.to_string()))
			.into_model::<series::ModelWithMetadata>()
			.one(core.conn.as_ref())
			.await?
			.ok_or("Series not found")?;

		let value = file.value(ctx)?;

		enforce_max_size(&value, core.config.max_file_upload_size)?;
		enforce_valid_content_type(&value)?;

		let mut image_buf = Vec::new();
		let mut file = value.content;
		file.read_to_end(&mut image_buf)?;

		let extension = Path::new(&value.filename)
			.extension()
			.and_then(|ext| ext.to_str())
			.map(str::to_ascii_lowercase)
			.ok_or("Expected file to have an extension")?;

		// Note: I chose to *safely* attempt the removal as to not block the upload, however after some
		// user testing I'd like to see if this becomes a problem. We'll see!
		match remove_thumbnails(
			std::slice::from_ref(&series.series.id),
			&core.config.thumbnails_directory(),
		)
		.await
		{
			Ok(count) => tracing::info!("Removed {} thumbnails!", count),
			Err(e) => tracing::error!(
				?e,
				"Failed to remove existing series thumbnail before replacing!"
			),
		}

		let path_buf =
			place_thumbnail(&series.series.id, &extension, &image_buf, &core.config)
				.await?;

		tracing::debug!(?path_buf, "Placed series thumbnail");

		let mut active = series.series.clone().into_active_model();
		active.thumbnail_path = Set(Some(path_buf.to_string_lossy().to_string()));
		series.series = active.update(core.conn.as_ref()).await?;
		bump_series_thumbnail_fallbacks(
			core.conn.as_ref(),
			std::slice::from_ref(&series.series.id),
		)
		.await?;

		let config = library_config::Entity::find()
			.filter(
				library_config::Column::LibraryId.eq(series.series.library_id.clone()),
			)
			.one(core.conn.as_ref())
			.await?
			.ok_or("Library config not found")?;

		let should_enqueue_placeholder = config.thumbnail_config.is_some()
			|| config.process_thumbnail_colors_even_without_config;

		if !should_enqueue_placeholder {
			tracing::info!(
                "Thumbnail config is not set to process colors without config, skipping placeholder generation"
            );
			return Ok(series.into());
		}

		tracing::debug!(
			"Enqueuing placeholder generation job for uploaded series thumbnail"
		);

		// Note: We do NOT enqueue a thumbnail generation job since that just overwrites the uploaded one lol. Stump will assume your
		// uploaded image is sized accordingly. We DO enqueue a placeholder generation job to ensure the colors etc are updated
		if let Err(e) = core
			.enqueue(StumpJob::PlaceholderGeneration {
				config: PlaceholderGenerationJobConfig {
					force_regenerate: true,
					scope: PlaceholderGenerationJobScope::Series(vec![series
						.series
						.id
						.clone()]),
				},
			})
			.await
		{
			tracing::error!(?e, "Failed to enqueue placeholder generation job");
		}

		Ok(series.into())
	}

	#[graphql(
		guard = "OptionalFeatureGuard::new(OptionalFeature::Upload).and(PermissionGuard::new(&[UserPermission::UploadFile, UserPermission::EditThumbnails]))"
	)]
	async fn upload_media_thumbnail(
		&self,
		ctx: &Context<'_>,
		id: ID,
		file: Upload,
	) -> Result<Media> {
		let AuthContext { user, .. } = ctx.data()?;
		let core = ctx.data::<CoreContext>()?;

		let mut book = media::ModelWithMetadata::find_for_user(user)
			.filter(media::Column::Id.eq(id.to_string()))
			.into_model::<media::ModelWithMetadata>()
			.one(core.conn.as_ref())
			.await?
			.ok_or("Book not found")?;

		let value = file.value(ctx)?;

		enforce_max_size(&value, core.config.max_file_upload_size)?;
		enforce_valid_content_type(&value)?;

		let mut image_buf = Vec::new();
		let mut file = value.content;
		file.read_to_end(&mut image_buf)?;

		let extension = Path::new(&value.filename)
			.extension()
			.and_then(|ext| ext.to_str())
			.map(str::to_ascii_lowercase)
			.ok_or("Expected file to have an extension")?;

		tracing::trace!(
			?extension,
			"Determined file extension of uploaded thumbnail. Preparing to replace..."
		);

		// Note: I chose to *safely* attempt the removal as to not block the upload, however after some
		// user testing I'd like to see if this becomes a problem. We'll see!
		let removal_result = remove_thumbnails(
			std::slice::from_ref(&book.media.id),
			&core.config.thumbnails_directory(),
		)
		.await;
		match removal_result {
			Ok(count) => tracing::info!("Removed {} thumbnails!", count),
			Err(e) => tracing::error!(
				?e,
				"Failed to remove existing book thumbnail before replacing!"
			),
		}

		let path_buf =
			place_thumbnail(&book.media.id, &extension, &image_buf, &core.config).await?;

		tracing::debug!(?path_buf, "Placed book thumbnail");

		let mut active = book.media.clone().into_active_model();
		active.thumbnail_path = Set(Some(path_buf.to_string_lossy().to_string()));
		book.media = active.update(core.conn.as_ref()).await?;
		bump_media_thumbnail_fallbacks(
			core.conn.as_ref(),
			book.media.series_id.as_deref(),
		)
		.await?;

		let config = library_config::Entity::find()
			.filter(
				library_config::Column::LibraryId.in_subquery(
					Query::select()
						.column(series::Column::LibraryId)
						.from(series::Entity)
						.and_where(series::Column::Id.eq(book.media.series_id.clone()))
						.to_owned(),
				),
			)
			.one(core.conn.as_ref())
			.await?
			.ok_or("Library config not found")?;

		let should_enqueue_placeholder = config.thumbnail_config.is_some()
			|| config.process_thumbnail_colors_even_without_config;

		if !should_enqueue_placeholder {
			tracing::info!(
                "Thumbnail config is not set to process colors without config, skipping placeholder generation"
            );
			return Ok(book.into());
		}

		tracing::debug!(
			"Enqueuing placeholder generation job for uploaded media thumbnail"
		);

		// Note: We do NOT enqueue a thumbnail generation job since that just overwrites the uploaded one lol. Stump will assume your
		// uploaded image is sized accordingly. We DO enqueue a placeholder generation job to ensure the colors etc are updated
		if let Err(e) = core
			.enqueue(StumpJob::PlaceholderGeneration {
				config: PlaceholderGenerationJobConfig {
					force_regenerate: true,
					scope: PlaceholderGenerationJobScope::Books(vec![book
						.media
						.id
						.clone()]),
				},
			})
			.await
		{
			tracing::error!(?e, "Failed to enqueue placeholder generation job");
		}

		Ok(book.into())
	}

	/// Upload a series thumbnail from a base64-encoded image string.
	/// Note: This was added specifically for Komf, which would have been annyoing to
	/// implement multipart uploads for
	#[graphql(
		guard = "PermissionGuard::new(&[UserPermission::UploadFile, UserPermission::EditThumbnails])"
	)]
	async fn upload_series_thumbnail_base64(
		&self,
		ctx: &Context<'_>,
		id: ID,
		image: String,
	) -> Result<Series> {
		let AuthContext { user, .. } = ctx.data()?;
		let core = ctx.data::<CoreContext>()?;

		let mut series = series::ModelWithMetadata::find_for_user(user)
			.filter(series::Column::Id.eq(id.to_string()))
			.into_model::<series::ModelWithMetadata>()
			.one(core.conn.as_ref())
			.await?
			.ok_or("Series not found")?;

		let (image_buf, extension) =
			decode_base64_image(&image, core.config.max_file_upload_size)?;

		match remove_thumbnails(
			std::slice::from_ref(&series.series.id),
			&core.config.thumbnails_directory(),
		)
		.await
		{
			Ok(count) => tracing::info!("Removed {} thumbnails!", count),
			Err(e) => tracing::error!(
				?e,
				"Failed to remove existing series thumbnail before replacing!"
			),
		}

		let path_buf =
			place_thumbnail(&series.series.id, &extension, &image_buf, &core.config)
				.await?;

		tracing::debug!(?path_buf, "Placed series thumbnail from base64");

		let mut active = series.series.clone().into_active_model();
		active.thumbnail_path = Set(Some(path_buf.to_string_lossy().to_string()));
		series.series = active.update(core.conn.as_ref()).await?;
		bump_series_thumbnail_fallbacks(
			core.conn.as_ref(),
			std::slice::from_ref(&series.series.id),
		)
		.await?;

		let config = library_config::Entity::find()
			.filter(
				library_config::Column::LibraryId.eq(series.series.library_id.clone()),
			)
			.one(core.conn.as_ref())
			.await?
			.ok_or("Library config not found")?;

		let should_enqueue_placeholder = config.thumbnail_config.is_some()
			|| config.process_thumbnail_colors_even_without_config;

		if !should_enqueue_placeholder {
			tracing::info!(
                "Thumbnail config is not set to process colors without config, skipping placeholder generation"
            );
			return Ok(series.into());
		}

		tracing::debug!(
			"Enqueuing placeholder generation job for uploaded series thumbnail"
		);

		// Note: We do NOT enqueue a thumbnail generation job since that just overwrites the uploaded one lol. Stump will assume your
		// uploaded image is sized accordingly. We DO enqueue a placeholder generation job to ensure the colors etc are updated
		if let Err(e) = core
			.enqueue(StumpJob::PlaceholderGeneration {
				config: PlaceholderGenerationJobConfig {
					force_regenerate: true,
					scope: PlaceholderGenerationJobScope::Series(vec![series
						.series
						.id
						.clone()]),
				},
			})
			.await
		{
			tracing::error!(?e, "Failed to enqueue placeholder generation job");
		}

		Ok(series.into())
	}

	/// Upload a media thumbnail from a base64-encoded image string.
	/// Note: This was added specifically for Komf, which would have been annyoing to
	/// implement multipart uploads for
	#[graphql(
		guard = "PermissionGuard::new(&[UserPermission::UploadFile, UserPermission::EditThumbnails])"
	)]
	async fn upload_media_thumbnail_base64(
		&self,
		ctx: &Context<'_>,
		id: ID,
		image: String,
	) -> Result<Media> {
		let AuthContext { user, .. } = ctx.data()?;
		let core = ctx.data::<CoreContext>()?;

		let mut book = media::ModelWithMetadata::find_for_user(user)
			.filter(media::Column::Id.eq(id.to_string()))
			.into_model::<media::ModelWithMetadata>()
			.one(core.conn.as_ref())
			.await?
			.ok_or("Book not found")?;

		let (image_buf, extension) =
			decode_base64_image(&image, core.config.max_file_upload_size)?;

		let removal_result = remove_thumbnails(
			std::slice::from_ref(&book.media.id),
			&core.config.thumbnails_directory(),
		)
		.await;
		match removal_result {
			Ok(count) => tracing::info!("Removed {} thumbnails!", count),
			Err(e) => tracing::error!(
				?e,
				"Failed to remove existing book thumbnail before replacing!"
			),
		}

		let path_buf =
			place_thumbnail(&book.media.id, &extension, &image_buf, &core.config).await?;

		tracing::debug!(?path_buf, "Placed book thumbnail from base64");

		let mut active = book.media.clone().into_active_model();
		active.thumbnail_path = Set(Some(path_buf.to_string_lossy().to_string()));
		book.media = active.update(core.conn.as_ref()).await?;
		bump_media_thumbnail_fallbacks(
			core.conn.as_ref(),
			book.media.series_id.as_deref(),
		)
		.await?;

		let config = library_config::Entity::find()
			.filter(
				library_config::Column::LibraryId.in_subquery(
					Query::select()
						.column(series::Column::LibraryId)
						.from(series::Entity)
						.and_where(series::Column::Id.eq(book.media.series_id.clone()))
						.to_owned(),
				),
			)
			.one(core.conn.as_ref())
			.await?
			.ok_or("Library config not found")?;

		let should_enqueue_placeholder = config.thumbnail_config.is_some()
			|| config.process_thumbnail_colors_even_without_config;

		if !should_enqueue_placeholder {
			tracing::info!(
                "Thumbnail config is not set to process colors without config, skipping placeholder generation"
            );
			return Ok(book.into());
		}

		tracing::debug!(
			"Enqueuing placeholder generation job for uploaded media thumbnail"
		);

		// Note: We do NOT enqueue a thumbnail generation job since that just overwrites the uploaded one lol. Stump will assume your
		// uploaded image is sized accordingly. We DO enqueue a placeholder generation job to ensure the colors etc are updated
		if let Err(e) = core
			.enqueue(StumpJob::PlaceholderGeneration {
				config: PlaceholderGenerationJobConfig {
					force_regenerate: true,
					scope: PlaceholderGenerationJobScope::Books(vec![book
						.media
						.id
						.clone()]),
				},
			})
			.await
		{
			tracing::error!(?e, "Failed to enqueue placeholder generation job");
		}

		Ok(book.into())
	}
}

fn enforce_max_size(value: &UploadValue, max_size: usize) -> Result<()> {
	let size = value.size();
	match size {
		Ok(size) if size as usize > max_size => Err(format!(
			"File size exceeds maximum upload size of {max_size} bytes"
		)
		.into()),
		Err(e) => {
			tracing::error!(?e, "Error getting file size");
			Err(format!("Error getting file size: {e}").into())
		},
		_ => {
			tracing::trace!(size = size.ok(), "Verified file size of uploaded file");
			Ok(())
		},
	}
}

fn enforce_valid_content_type(value: &UploadValue) -> Result<()> {
	let content_type = value
		.content_type
		.clone()
		.as_deref()
		.and_then(|s| s.parse::<ContentType>().ok())
		.ok_or("Could not verify content of file".to_string())?;

	if !content_type.is_image() {
		return Err("Uploaded file is not an image".into());
	}

	tracing::trace!(?content_type, "Verified content type of uploaded file");

	Ok(())
}

/// Decode a base64-encoded image string and detect its file extension using magic bytes.
/// Returns a tuple of (image bytes, extension string).
fn decode_base64_image(image: &str, max_size: usize) -> Result<(Vec<u8>, String)> {
	const ALLOWED_IMAGE_TYPES: &[(&str, &str)] = &[
		("image/png", "png"),
		("image/jpeg", "jpg"),
		("image/webp", "webp"),
		("image/gif", "gif"),
		("image/heif", "heif"),
		("image/jxl", "jxl"),
		("image/avif", "avif"),
	];

	let image_buf = BASE64
		.decode(image)
		.map_err(|e| format!("Failed to decode base64 image: {e}"))?;

	if image_buf.len() > max_size {
		return Err(format!(
			"Image size exceeds maximum upload size of {max_size} bytes"
		)
		.into());
	}

	let inferred =
		infer::get(&image_buf).ok_or("Unable to detect image type from provided data")?;

	let mime_type = inferred.mime_type();

	let extension = ALLOWED_IMAGE_TYPES
		.iter()
		.find(|(mime, _)| *mime == mime_type)
		.map(|(_, ext)| (*ext).to_string())
		.ok_or_else(|| {
			format!(
				"Unsupported image type: {mime_type}. Allowed types are: {:?}",
				ALLOWED_IMAGE_TYPES
					.iter()
					.map(|(mime, _)| *mime)
					.collect::<Vec<_>>()
			)
		})?;

	Ok((image_buf, extension))
}

/// A helper function to copy a tempfile from a multipart to a provided path
async fn copy_tempfile_to_location(data: UploadValue, target_path: &Path) -> Result<()> {
	// We want to prevent overwriting something that already exists
	if fs::metadata(target_path).await.is_ok() {
		return Err(format!("File already exists at {target_path:?}",).into());
	}

	// Get a tokio::fs::File for the temporary file
	let mut temp_file = fs::File::from_std(data.content);

	// Copy the bytes to the target location
	let mut target_file = fs::File::create(target_path).await?;
	tokio::io::copy(&mut temp_file, &mut target_file).await?;

	Ok(())
}

/// Validate the contents of the series upload file. This function will return an error
/// if the contents of the uploaded archive do not match the permitted file types or if
/// the archive contains malformed paths.
fn validate_series_upload_contents(
	value: &mut UploadValue,
	series_path: &Path,
	allow_overwrite: bool,
) -> Result<()> {
	let temp_file = &mut value.content;
	tokio::task::block_in_place(|| {
		let mut zip_archive = ZipArchive::new(temp_file)
			.map_err(|_| "Error opening zip archive".to_string())?;

		// Loop over each file in the zip archive and test them
		for i in 0..zip_archive.len() {
			let mut zip_file = zip_archive.by_index(i)?;

			// Skip directories
			if zip_file.is_dir() {
				continue;
			}

			// Using `enclosed_name` also validates against path traversal attacks:
			// https://docs.rs/zip/1.1.3/zip/read/struct.ZipFile.html#method.enclosed_name
			let Some(enclosed_path) = zip_file.enclosed_name() else {
				return Err("Series zip contained a malformed path".into());
			};
			// Get the path that the archive file will be extracted to
			let extraction_path = series_path.join(enclosed_path);

			// Error if the file already exists and we aren't allowing overwrites
			if extraction_path.exists() && !allow_overwrite {
				return Err(format!(
                    "Unable to extract zip contents to {extraction_path:?}, overwrites are disabled"
                ).into());
			}

			validate_zip_file(&mut zip_file)?;
		}

		Ok::<(), Error>(())
	})?;

	Ok(())
}

/// Validate a file within a series upload archive. This function checks the file against
/// allowed file types based on extension as well as magic byte inference. If either check
/// fails then an error is returned.
fn validate_zip_file(zip_file: &mut ZipFile) -> Result<()> {
	/// Any file extension not in this list will trigger an error
	const ALLOWED_EXTENSIONS: &[&str] = &[
		"cbr", "cbz", "epub", "pdf", "xml", "json", "png", "jpg", "jpeg", "webp", "gif",
		"heif", "jxl", "avif",
	];

	/// Any inferred mime type not in this list will trigger an error
	const ALLOWED_TYPES: &[&str] = &[
		"application/zip",
		"application/vnd.comicbook+zip",
		"application/vnd.comicbook-rar",
		"application/epub+zip",
		"application/pdf",
		"application/xml",
		"application/json",
		"image/png",
		"image/jpeg",
		"image/webp",
		"image/gif",
		"image/heif",
		"image/jxl",
		"image/avif",
	];

	let Some(enclosed_path) = zip_file.enclosed_name() else {
		return Err("Series zip contained a malformed path".into());
	};

	let extension = enclosed_path
		.extension()
		.and_then(|ext| ext.to_str())
		.map(str::to_ascii_lowercase)
		.ok_or("Expected zip contents {enclosed_path:?} to have an extension")?;

	if !ALLOWED_EXTENSIONS.contains(&extension.as_str()) {
		return Err(format!(
			"Zip contents {enclosed_path:?} has a disallowed extension, permitted extensions are: {ALLOWED_EXTENSIONS:?}"
		).into());
	}

	// Read first five bytes from which to infer content type
	let mut magic_bytes = [0u8; 5];
	zip_file
		.read_exact(&mut magic_bytes)
		.map_err(|_| "Failed to read first five bytes of zip file.".to_string())?;

	let inferred_type = infer::get(&magic_bytes)
		.ok_or(format!(
			"Unable to infer type for zip contents {enclosed_path:?}"
		))?
		.mime_type();

	if !ALLOWED_TYPES.contains(&inferred_type) {
		return Err(format!(
			"Zip contents {enclosed_path:?} has a disallowed mime type: {inferred_type}, permitted types are: {ALLOWED_TYPES:?}"
		).into());
	}

	Ok(())
}

/// A helper function to validate the file used for a books upload, this function
/// will return an error if the file is not the appropriate file type.
fn validate_book_file(value: &mut UploadValue) -> Result<()> {
	/// Any file extension not in this list will trigger an error
	const ALLOWED_EXTENSIONS: &[&str] = &["cbr", "cbz", "epub", "pdf"];

	/// Any inferred mime type not in this list will trigger an error
	const ALLOWED_TYPES: &[&str] = &[
		"application/zip",
		"application/vnd.comicbook+zip",
		"application/vnd.comicbook-rar",
		"application/epub+zip",
		"application/pdf",
	];

	let file_name = value.filename.clone();
	let extension = Path::new(&file_name)
		.extension()
		.and_then(|ext| ext.to_str())
		.map(str::to_ascii_lowercase)
		.ok_or_else(|| format!("Expected file {file_name} to have an extension."))?;

	if !ALLOWED_EXTENSIONS.contains(&extension.as_str()) {
		return Err(format!(
			"File {file_name} has a disallowed extension, permitted extensions are: {ALLOWED_EXTENSIONS:?}"
		).into());
	}

	let file = &mut value.content;
	let magic_bytes = BufReader::new(&*file)
		.bytes()
		.take(5)
		.collect::<Result<Vec<_>, _>>()?;
	file.rewind()?;

	let inferred_type = infer::get(&magic_bytes)
		.ok_or_else(|| format!("Unable to infer type for file {file_name}"))?
		.mime_type();

	if !ALLOWED_TYPES.contains(&inferred_type) {
		return Err(format!(
			"File {file_name} has a disallowed mime type: {inferred_type}, permitted types are: {ALLOWED_TYPES:?}"
		).into());
	}

	Ok(())
}

/// A helper function to validate the file used for a series upload, this function
/// will return an error if the file is not the appropriate file type.
fn validate_series_upload(value: &UploadValue) -> Result<()> {
	/// Any content type for a series upload that is not in this list will trigger an error.
	const PERMITTED_CONTENT_TYPES: &[&str] =
		&["application/zip", "application/x-zip-compressed"];

	let file_name = value.filename.clone();
	if !file_name.to_ascii_lowercase().ends_with(".zip") {
		return Err(format!(
			"Invalid file extension: {file_name}. Only zip files are allowed."
		)
		.into());
	}

	if let Some(content_type) = value.content_type.clone() {
		if !PERMITTED_CONTENT_TYPES.contains(&content_type.as_str()) {
			return Err(format!(
				"Invalid content-type: {content_type:?}. Only zip files are allowed."
			)
			.into());
		}
	} else {
		return Err(
			"Invalid content-type, expected uploaded series to have a content-type."
				.into(),
		);
	}

	Ok(())
}

/// Returns `true` if a parameter specifying a path from another path contains no parent directory components.
///
/// Upload paths for books are received as a path offset, where the actual path is constructed as
/// `{library_path}/{offset}`. This could be a security vulnerability if someone sent an upload with
/// a path containing a `..` to push the path back to the parent directory. This could be used to escape
/// the library and upload things elsewhere. It also means that accepting only paths that start with the
/// library path isn't sufficient.
///
/// This function will reject any paths that include a parent directory component. There is unlikely to be
/// any circumstance where a client sending one would be appropriate anyhow.
///
/// Note: this does **not** reject absolute paths, see [`get_books_path`] and [`get_series_path`] for
/// where absolute values are handled.
fn is_subpath_secure(params: &str) -> bool {
	let path = Path::new(params);

	for component in path.components() {
		if component == std::path::Component::ParentDir {
			return false;
		}
	}

	true
}

/// Validates that a user-provided filename is safe to join onto the placement path:
///
/// - Must be a single, normal path component
/// - Absolute paths, parent directory components, and multi-segment paths are all refused
///
/// This is to prevent e.g. an upload like `../../book.epub` or `/tmp/book.epub` from
/// being allowed (joining an absolute path replaces the base entirely)
fn validate_upload_filename(file_name: &str) -> Result<()> {
	let mut components = Path::new(file_name).components();
	let is_single_normal_component =
		matches!(components.next(), Some(std::path::Component::Normal(_)))
			&& components.next().is_none();

	if !is_single_normal_component || file_name.contains('\\') {
		return Err(format!(
			"Invalid file name: {file_name}. File names must be a single path component"
		)
		.into());
	}

	Ok(())
}

/// A helper function to generate the path at which books should be placed
/// given an input [`UploadBooksRequest`] and library.
fn get_books_path(place_at: &str, library: &library::Model) -> Result<PathBuf> {
	if !is_subpath_secure(place_at) {
		return Err("Invalid upload path placement parameters".into());
	}

	let placement_path = resolve_placement_path(place_at, library)?;

	Ok(placement_path)
}

/// Resolves a user-provided placement path against the library path:
///
/// - Relative values are joined onto the library path
/// - Absolute values are only allowed when they resolve inside the library directory
///
/// Note: `Path::join` replaces the base path entirely when given an absolute value, so absolute
/// paths must be validated against the library path
fn resolve_placement_path(place_at: &str, library: &library::Model) -> Result<PathBuf> {
	let place_at_path = Path::new(place_at);

	if place_at_path.is_absolute() {
		if !place_at_path.starts_with(Path::new(&library.path)) {
			return Err("Upload path must be within the library directory".into());
		}

		Ok(place_at_path.to_path_buf())
	} else {
		Ok(Path::new(&library.path).join(place_at_path))
	}
}

/// A helper function to generate the path at which a series zip should be placed
/// given an input [`UploadSeriesRequest`] and library.
fn get_series_path(
	place_at: &str,
	series_dir_name: &str,
	library: &library::Model,
) -> Result<PathBuf> {
	if !is_subpath_secure(place_at) {
		return Err("Invalid upload path placement parameters".into());
	}

	// Validate the series directory name - the same traversal concerns apply here.
	// It must also be relative since an absolute value would replace the entire
	// placement path when joined
	if !is_subpath_secure(series_dir_name) || Path::new(series_dir_name).is_absolute() {
		return Err("Invalid series directory name".into());
	}

	// Get path that the series upload will be placed at, accounting for possible full path
	let placement_path = resolve_placement_path(place_at, library)?;

	Ok(placement_path.join(series_dir_name))
}

#[cfg(test)]
mod tests {
	use super::*;
	use models::shared::enums::FileStatus;

	fn library_at(path: &str) -> library::Model {
		library::Model {
			id: "123".to_string(),
			name: "A library".to_string(),
			created_at: chrono::Utc::now().into(),
			updated_at: Some(chrono::Utc::now().into()),
			description: None,
			emoji: None,
			last_scanned_at: None,
			config_id: 1,
			path: path.to_string(),
			status: FileStatus::Ready,
			thumbnail_meta: None,
			thumbnail_path: None,
		}
	}

	#[test]
	fn test_is_subpath_secure() {
		assert!(is_subpath_secure(""));
		assert!(is_subpath_secure("."));
		assert!(is_subpath_secure("subdirectory"));
		assert!(is_subpath_secure("sub/directory"));
		assert!(is_subpath_secure("/absolutely/fine"));

		assert!(!is_subpath_secure(".."));
		assert!(!is_subpath_secure("../"));
		assert!(!is_subpath_secure("sub/../other"));
		assert!(!is_subpath_secure("/abs/../path"));
	}

	#[test]
	fn test_validate_upload_filename_rejects_traversal() {
		assert!(validate_upload_filename("../book.epub").is_err());
		assert!(validate_upload_filename("..\\..\\book.epub").is_err());
		assert!(validate_upload_filename("../../etc/book.epub").is_err());
		assert!(validate_upload_filename("sub/book.epub").is_err());
	}

	#[test]
	fn test_validate_upload_filename_rejects_absolute_and_special_names() {
		assert!(validate_upload_filename("/tmp/book.epub").is_err());
		assert!(validate_upload_filename("/etc/book.epub").is_err());
		assert!(validate_upload_filename("C:\\book.epub").is_err());
		assert!(validate_upload_filename("..").is_err());
		assert!(validate_upload_filename(".").is_err());
		assert!(validate_upload_filename("").is_err());
	}

	#[test]
	fn test_get_books_path_relative_offset() {
		let library = library_at("/data/library");
		let path = get_books_path("subdir", &library).expect("should be valid");
		assert_eq!(path, PathBuf::from("/data/library/subdir"));
	}

	#[test]
	fn test_get_books_path_absolute_within_library() {
		let library = library_at("/data/library");
		let path =
			get_books_path("/data/library/subdir", &library).expect("should be valid");
		assert_eq!(path, PathBuf::from("/data/library/subdir"));
	}

	#[test]
	fn test_get_books_path_rejects_traversal() {
		let library = library_at("/data/library");
		assert!(get_books_path("../elsewhere", &library).is_err());
		assert!(get_books_path("sub/../../elsewhere", &library).is_err());
	}

	#[test]
	fn test_get_books_path_rejects_absolute_outside_library() {
		let library = library_at("/data/library");
		assert!(get_books_path("/tmp", &library).is_err());
		assert!(get_books_path("/etc", &library).is_err());
		assert!(get_books_path("/data/library/sub/../../../tmp", &library).is_err());
	}

	#[test]
	fn test_get_books_path_rejects_prefix_lookalike() {
		let library = library_at("/data/library");
		assert!(get_books_path("/data/library-hahacannotfoolme", &library).is_err());
		assert!(get_books_path("/data/libraryooglywoogly", &library).is_err());
	}

	#[test]
	fn test_get_series_path_relative_offset() {
		let library = library_at("/data/library");
		let path =
			get_series_path("subdir", "My Series", &library).expect("should be valid");
		assert_eq!(path, PathBuf::from("/data/library/subdir/My Series"));
	}

	#[test]
	fn test_get_series_path_absolute_within_library() {
		let library = library_at("/data/library");
		let path = get_series_path("/data/library", "My Series", &library)
			.expect("should be valid");
		assert_eq!(path, PathBuf::from("/data/library/My Series"));
	}

	#[test]
	fn test_get_series_path_rejects_traversal() {
		let library = library_at("/data/library");
		assert!(get_series_path("../elsewhere", "My Series", &library).is_err());
		assert!(get_series_path("subdir", "../My Series", &library).is_err());
		assert!(get_series_path("subdir", "..", &library).is_err());
	}

	#[test]
	fn test_get_series_path_rejects_absolute_outside_library() {
		let library = library_at("/data/library");
		assert!(get_series_path("/tmp", "My Series", &library).is_err());
		assert!(get_series_path("subdir", "/tmp", &library).is_err());
		assert!(get_series_path("/data/library", "/tmp", &library).is_err());
	}

	#[test]
	fn test_get_series_path_rejects_prefix_lookalike() {
		let library = library_at("/data/library");
		assert!(
			get_series_path("/data/library-hahacannotfoolme", "My Series", &library)
				.is_err()
		);
	}
}
