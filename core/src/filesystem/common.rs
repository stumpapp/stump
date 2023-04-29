use std::{ffi::OsStr, path::Path};
use tracing::error;
use walkdir::WalkDir;

use super::{media::is_accepted_cover_name, ContentType};

pub trait IsImage {
	fn is_image(&self) -> bool;
}

pub trait OsStrUtils {
	fn try_to_string(&self) -> Option<String>;
}

impl OsStrUtils for OsStr {
	fn try_to_string(&self) -> Option<String> {
		self.to_str().map(|str| str.to_string())
	}
}

pub struct FileParts {
	file_name: String,
	file_stem: String,
	extension: String,
}

pub trait PathUtils {
	fn file_parts(&self) -> FileParts;
	fn infer_kind(&self) -> std::io::Result<Option<infer::Type>>;
	fn is_hidden_file(&self) -> bool;
	fn should_ignore(&self) -> bool;
	fn is_supported(&self) -> bool;
	fn is_img(&self) -> bool;
	fn is_thumbnail_img(&self) -> bool;
	fn dir_has_media(&self) -> bool;
	fn dir_has_media_deep(&self) -> bool;
}

impl PathUtils for Path {
	fn file_parts(&self) -> FileParts {
		let file_name = self
			.file_name()
			.and_then(|os_str| os_str.try_to_string())
			.unwrap_or_default();
		let file_stem = self
			.file_stem()
			.and_then(|os_str| os_str.try_to_string())
			.unwrap_or_default();
		let extension = self
			.extension()
			.and_then(|os_str| os_str.try_to_string())
			.unwrap_or_default();

		FileParts {
			file_name,
			file_stem,
			extension,
		}
	}

	/// Returns the result of `infer::get_from_path`.
	fn infer_kind(&self) -> std::io::Result<Option<infer::Type>> {
		infer::get_from_path(self)
	}

	/// Returns true if the file is hidden (i.e. starts with a dot).
	fn is_hidden_file(&self) -> bool {
		let FileParts { file_name, .. } = self.file_parts();

		file_name.starts_with('.')
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
		if self.is_hidden_file() {
			return true;
		}

		!self.is_supported()
	}

	/// Returns true if the file is an image. This is a strict check when infer
	/// can determine the file type, and a loose extension-based check when infer cannot.
	fn is_img(&self) -> bool {
		if let Ok(Some(file_type)) = infer::get_from_path(self) {
			return file_type.mime_type().starts_with("image/");
		}

		let FileParts { extension, .. } = self.file_parts();

		extension.eq_ignore_ascii_case("jpg")
			|| extension.eq_ignore_ascii_case("png")
			|| extension.eq_ignore_ascii_case("jpeg")
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
		if !self.is_img() {
			return false;
		}

		let FileParts { file_stem, .. } = self.file_parts();

		is_accepted_cover_name(&file_stem)
	}

	/// Returns true if the directory has any media files in it. This is a shallow
	/// check, and will not check subdirectories.
	fn dir_has_media(&self) -> bool {
		if !self.is_dir() {
			return false;
		}

		let items = std::fs::read_dir(self);
		if items.is_err() {
			error!(
				error = ?items.unwrap_err(),
				path = ?self,
				"IOError: failed to read directory"
			);
			return false;
		}

		items
			.unwrap()
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
