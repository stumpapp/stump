use std::{
	io::{Read, Seek},
	path::{Path, PathBuf},
};

use async_graphql::{
	Context, Error, InputObject, Object, Result, Upload, UploadValue, ID,
};
use models::{
	entity::{library, media, series},
	shared::enums::UserPermission,
};
use sea_orm::{prelude::*, QuerySelect};
use stump_core::filesystem::{
	image::{place_thumbnail, remove_thumbnails},
	scanner::LibraryScanJob,
	ContentType,
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

// TODO(graphql): Enforce upload limits, e.g. max file size at router

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
			let file_path = placement_path.join(file_name);

			copy_tempfile_to_location(value, &file_path).await?;
		}

		// Start a scan of the library
		core.enqueue_job(LibraryScanJob::new(library.id, library.path, None))
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

		// Start a scan of the library
		core.enqueue_job(LibraryScanJob::new(library.id, library.path, None))
			.map_err(|e| {
				tracing::error!(?e, "Failed to enqueue library scan job");
				"Failed to enqueue library scan job".to_string()
			})?;

		Ok(true)
	}

	// TODO(graphql): There is a LOT of duplication here, and only subtle differences wrt the queries.
	// I think we can refactor this into some utility function(s) that take the model type and the ID as parameters

	#[graphql(
		guard = "OptionalFeatureGuard::new(OptionalFeature::Upload).and(PermissionGuard::new(&[UserPermission::UploadFile, UserPermission::EditLibrary]))"
	)]
	async fn upload_library_thumbnail(
		&self,
		ctx: &Context<'_>,
		id: ID,
		file: Upload,
	) -> Result<Library> {
		let AuthContext { user, .. } = ctx.data()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let library = library::Entity::find_for_user(user)
			.select_only()
			.filter(library::Column::Id.eq(id.to_string()))
			.one(conn)
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
		match remove_thumbnails(&[library.id.clone()], &core.config.get_thumbnails_dir())
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

		Ok(library.into())
	}

	#[graphql(
		guard = "OptionalFeatureGuard::new(OptionalFeature::Upload).and(PermissionGuard::new(&[UserPermission::UploadFile, UserPermission::EditLibrary]))"
	)]
	async fn upload_series_thumbnail(
		&self,
		ctx: &Context<'_>,
		id: ID,
		file: Upload,
	) -> Result<Series> {
		let AuthContext { user, .. } = ctx.data()?;
		let core = ctx.data::<CoreContext>()?;
		let _conn = core.conn.as_ref();

		let series = series::ModelWithMetadata::find_for_user(user)
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
			&[series.series.id.clone()],
			&core.config.get_thumbnails_dir(),
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

		Ok(series.into())
	}

	#[graphql(
		guard = "OptionalFeatureGuard::new(OptionalFeature::Upload).and(PermissionGuard::new(&[UserPermission::UploadFile, UserPermission::EditLibrary]))"
	)]
	async fn upload_media_thumbnail(
		&self,
		ctx: &Context<'_>,
		id: ID,
		file: Upload,
	) -> Result<Media> {
		let AuthContext { user, .. } = ctx.data()?;
		let core = ctx.data::<CoreContext>()?;

		let book = media::ModelWithMetadata::find_for_user(user)
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

		// Note: I chose to *safely* attempt the removal as to not block the upload, however after some
		// user testing I'd like to see if this becomes a problem. We'll see!
		let removal_result = remove_thumbnails(
			&[book.media.id.clone()],
			&core.config.get_thumbnails_dir(),
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

		Ok(book.into())
	}
}

fn enforce_max_size(value: &UploadValue, max_size: usize) -> Result<()> {
	match value.size() {
		Ok(size) if size as usize > max_size => Err(format!(
			"File size exceeds maximum upload size of {max_size} bytes"
		)
		.into()),
		Err(e) => {
			tracing::error!(?e, "Error getting file size");
			Err(format!("Error getting file size: {e}").into())
		},
		_ => Ok(()),
	}
}

fn enforce_valid_content_type(value: &UploadValue) -> Result<()> {
	let content_type = value
		.content_type
		.clone()
		.as_deref()
		.map(ContentType::from)
		.ok_or("Could not verify content of file".to_string())?;

	if !content_type.is_image() {
		return Err("Uploaded file is not an image".into());
	}

	Ok(())
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
	let magic_bytes = file.bytes().take(5).collect::<Result<Vec<_>, _>>()?;
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
fn is_subpath_secure(params: &str) -> bool {
	let path = Path::new(params);

	for component in path.components() {
		if component == std::path::Component::ParentDir {
			return false;
		}
	}

	true
}

/// A helper function to generate the path at which books should be placed
/// given an input [`UploadBooksRequest`] and library.
fn get_books_path(place_at: &str, library: &library::Model) -> Result<PathBuf> {
	// Validate the placement path parameters, error otherwise
	// This is an important security check.
	if !is_subpath_secure(place_at) {
		return Err("Invalid upload path placement parameters".into());
	}

	// Get path that uploads will be placed at, account for possible full path
	let placement_path = if place_at.starts_with(&library.path) {
		PathBuf::from(place_at)
	} else {
		Path::new(&library.path).join(place_at)
	};

	Ok(placement_path)
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

	// Validate the series directory name - the same traversal concerns apply here
	if !is_subpath_secure(series_dir_name) {
		return Err("Invalid series directory name".into());
	}

	// Get path that the series upload will be placed at, accounting for possible full path
	let placement_path = if place_at.starts_with(&library.path) {
		PathBuf::from(place_at).join(series_dir_name)
	} else {
		Path::new(&library.path)
			.join(place_at)
			.join(series_dir_name)
	};

	Ok(placement_path)
}
