use std::{ffi::OsStr, path::Path};

use globset::GlobSet;

use crate::fs_utils::ContentType;

pub trait IsImage {
	fn is_image(&self) -> bool;
}

pub trait OsStrUtils {
	fn try_to_string(&self) -> Option<String>;
}

impl OsStrUtils for OsStr {
	fn try_to_string(&self) -> Option<String> {
		self.to_str().map(ToString::to_string)
	}
}

pub struct FileParts {
	pub file_name: String,
	pub file_stem: String,
	pub extension: String,
}

pub trait PathUtils {
	/// Returns the file name, file stem, and extension of the file.
	fn file_parts(&self) -> FileParts;
	/// Returns the result of `infer::get_from_path`.
	fn infer_kind(&self) -> std::io::Result<Option<infer::Type>>;
	/// Returns the content type of the file based on the extension.
	fn naive_content_type(&self) -> ContentType;
	/// Returns true if the file is hidden (i.e. starts with a dot). Also checks for
	/// files within a __MACOSX directory.
	fn is_hidden_file(&self) -> bool;
	/// Returns true if the file is supported by Stump.
	fn is_default_ignored(&self) -> bool;
	/// Returns true if the file is an image.
	fn is_supported(&self) -> bool;
	/// Returns true if the file is an image.
	fn is_img(&self) -> bool;
	/// Returns true if the file is a thumbnail image. This calls the `is_img` function
	/// from the same trait, and then checks if the file name is one of the following:
	/// - cover
	/// - thumbnail
	/// - folder
	///
	/// These will *potentially* be reserved filenames in the future... Not sure
	/// if this functionality will be kept.
	fn is_thumbnail_img(&self) -> bool;
	/// Returns true if the directory has any media files in it. This is a shallow
	/// check, and will not check subdirectories.
	fn dir_has_media(&self, ignore_rules: &GlobSet) -> bool;
	/// Returns true if the directory has any media files in it. This is a deep
	/// check, and will check *all* subdirectories.
	fn dir_has_media_deep(&self, ignore_rules: &GlobSet) -> bool;
}

impl PathUtils for Path {
	fn file_parts(&self) -> FileParts {
		let file_name = self
			.file_name()
			.and_then(OsStrUtils::try_to_string)
			.unwrap_or_else(|| {
				tracing::warn!(path = ?self, "Failed to get file name");
				String::default()
			});
		let file_stem = self
			.file_stem()
			.and_then(OsStrUtils::try_to_string)
			.unwrap_or_else(|| {
				tracing::warn!(path = ?self, "Failed to get file stem");
				String::default()
			});
		let extension = self
			.extension()
			.and_then(OsStrUtils::try_to_string)
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

	fn naive_content_type(&self) -> ContentType {
		let extension = self
			.extension()
			.and_then(|e| e.to_str())
			.unwrap_or_default();

		if extension.is_empty() {
			return ContentType::UNKNOWN;
		}

		ContentType::from_extension(extension)
	}

	/// Returns true if the file is hidden (i.e. starts with a dot).
	fn is_hidden_file(&self) -> bool {
		// If the file is contained inside of a __MACOSX directory, assume it is hidden.
		// We don't want to deal with these files.
		if self.starts_with("__MACOSX") {
			return true;
		}

		let file_name = self
			.file_name()
			.and_then(OsStrUtils::try_to_string)
			.unwrap_or_else(|| {
				tracing::warn!(path = ?self, "Failed to get file name");
				String::default()
			});

		file_name.starts_with('.')
	}

	// TODO(327): Remove infer usage
	/// Returns true if the file is a supported media file. This is a strict check when
	/// infer can determine the file type, and a loose extension-based check when infer cannot.
	fn is_supported(&self) -> bool {
		let content_type = ContentType::from_path(self);
		content_type != ContentType::UNKNOWN && !content_type.is_image()
	}

	/// Returns true when the scanner should not persist the file to the database.
	/// First checks if the file is hidden (i.e. starts with a dot), then checks if
	/// the file is supported by Stump.
	fn is_default_ignored(&self) -> bool {
		if self.is_hidden_file() {
			return true;
		}

		!self.is_supported()
	}

	/// Returns true if the file is an image. This is a naive check based on the extension.
	fn is_img(&self) -> bool {
		self.naive_content_type().is_image()
	}

	// TODO(reorg): move out of path_utils, into image?
	fn is_thumbnail_img(&self) -> bool {
		if !self.is_img() {
			return false;
		}

		let FileParts { file_stem, .. } = self.file_parts();

		is_accepted_cover_name(&file_stem)
	}
}
