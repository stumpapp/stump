use std::path::{Path, PathBuf};

mod batch_scanner;
mod setup;
mod sync_scanner;
mod utils;

use walkdir::WalkDir;

use crate::{
	db::models::{LibraryScanMode, Media},
	job::runner::RunnerCtx,
	prelude::{ContentType, CoreResult},
};

pub async fn scan(
	ctx: RunnerCtx,
	path: String,
	runner_id: String,
	scan_mode: LibraryScanMode,
) -> CoreResult<u64> {
	match scan_mode {
		LibraryScanMode::Batched => batch_scanner::scan(ctx, path, runner_id).await,
		LibraryScanMode::Sync => sync_scanner::scan(ctx, path, runner_id).await,
		_ => unreachable!("A job should not have reached this point if the scan mode is not batch or sync."),
	}
}

// TODO: refactor this trait? yes please
pub trait ScannedFileTrait {
	fn get_kind(&self) -> std::io::Result<Option<infer::Type>>;
	fn is_invisible_file(&self) -> bool;
	fn should_ignore(&self) -> bool;
	fn is_supported(&self) -> bool;
	fn is_img(&self) -> bool;
	fn is_thumbnail_img(&self) -> bool;
	fn dir_has_media(&self) -> bool;
	fn dir_has_media_deep(&self) -> bool;
}

impl ScannedFileTrait for Path {
	/// Returns the result of `infer::get_from_path`.
	fn get_kind(&self) -> std::io::Result<Option<infer::Type>> {
		infer::get_from_path(self)
	}

	/// Returns true if the file is hidden (i.e. starts with a dot).
	fn is_invisible_file(&self) -> bool {
		self.file_name()
			.unwrap_or_default()
			.to_str()
			.map(|name| name.starts_with('.'))
			.unwrap_or(false)
	}

	/// Returns true if the file is a supported media file. This is a strict check when
	/// infer can determine the file type, and a loose extension-based check when infer cannot.
	fn is_supported(&self) -> bool {
		let content_type = ContentType::from_path(self);
		content_type != ContentType::UNKNOWN && !content_type.is_image()
	}

	/// Returns true when the scanner should not persist the file to the database.
	/// First checks if the file is hidden (i.e. starts with a dot), then checks if
	/// the file is supported by Stump.
	//
	// TODO: This will change in the future to allow for unsupported files to
	// be added to the database with *minimal* functionality.
	fn should_ignore(&self) -> bool {
		if self.is_invisible_file() {
			return true;
		}

		!self.is_supported()
	}

	/// Returns true if the file is an image. This is a strict check when infer
	/// can determine the file type, and a loose extension-based check when infer cannot.
	fn is_img(&self) -> bool {
		ContentType::from_path(self).is_image()
	}

	/// Returns true if the file is a thumbnail image. This calls the `is_img` function
	/// from the same trait, and then checks if the file name is one of the following:
	/// - cover
	/// - thumbnail
	/// - folder
	///
	/// These will *potentially* be reserved filenames in the future... Not sure
	/// if this functionality will be kept.
	fn is_thumbnail_img(&self) -> bool {
		self.is_img()
			&& self
				.file_stem()
				.unwrap_or_default()
				.to_str()
				.map(|name| {
					name.eq_ignore_ascii_case("cover")
						|| name.eq_ignore_ascii_case("thumbnail")
						|| name.eq_ignore_ascii_case("folder")
				})
				.unwrap_or(false)
	}

	/// Returns true if the directory has any media files in it. This is a shallow
	/// check, and will not check subdirectories.
	fn dir_has_media(&self) -> bool {
		if !self.is_dir() {
			return false;
		}

		let items = std::fs::read_dir(self);

		if items.is_err() {
			return false;
		}

		let items = items.unwrap();

		items
			.filter_map(|item| item.ok())
			.filter(|item| item.path() != self)
			.any(|f| !f.path().should_ignore())
	}

	/// Returns true if the directory has any media files in it. This is a deep
	/// check, and will check *all* subdirectories.
	fn dir_has_media_deep(&self) -> bool {
		if !self.is_dir() {
			return false;
		}

		WalkDir::new(self)
			.into_iter()
			.filter_map(|item| item.ok())
			.filter(|item| item.path() != self)
			.any(|f| !f.path().should_ignore())
	}
}

// FIXME: I don't want to allow this, however Box<Media> won't work
#[allow(clippy::large_enum_variant)]
pub enum BatchScanOperation {
	CreateMedia { path: PathBuf, series_id: String },
	UpdateMedia(Media),
	MarkMediaMissing { path: String },
	// Note: this will be tricky. I will need to have this as a separate operation so I don't chance
	// issuing concurrent writes to the database. But will be a bit of a pain, not too bad though.
	// LogFailureEvent { event: CoreEvent },
}
