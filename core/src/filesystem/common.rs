use std::{
	ffi::OsStr,
	fs::File,
	io::Read,
	path::{Path, PathBuf},
};
use tracing::error;
use walkdir::WalkDir;

use super::{media::is_accepted_cover_name, ContentType, FileError};

pub const ACCEPTED_IMAGE_EXTENSIONS: [&str; 8] =
	["jpg", "png", "jpeg","jxl", "webp", "gif", "avif", "heif"];

pub fn read_entire_file<P: AsRef<Path>>(path: P) -> Result<Vec<u8>, FileError> {
	let mut file = File::open(path)?;

	let mut buf = Vec::new();
	file.read_to_end(&mut buf)?;

	Ok(buf)
}

/// A function that returns the path of a thumbnail image, if it exists.
/// This should be used when the thumbnail extension is not known.
pub fn get_unknown_thumnail(id: &str, mut thumbnails_dir: PathBuf) -> Option<PathBuf> {
	for extension in ACCEPTED_IMAGE_EXTENSIONS.iter() {
		thumbnails_dir.push(format!("{}.{}", id, extension));

		if thumbnails_dir.exists() {
			return Some(thumbnails_dir);
		}

		thumbnails_dir.pop();
	}

	None
}

pub fn get_unknown_image(mut base_path: PathBuf) -> Option<PathBuf> {
	for extension in ACCEPTED_IMAGE_EXTENSIONS.iter() {
		base_path.set_extension(extension);

		if base_path.exists() {
			return Some(base_path);
		}

		base_path.set_extension("");
	}

	None
}

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
	fn should_ignore(&self) -> bool;
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
	fn dir_has_media(&self) -> bool;
	/// Returns true if the directory has any media files in it. This is a deep
	/// check, and will check *all* subdirectories.
	fn dir_has_media_deep(&self) -> bool;
}

impl PathUtils for Path {
	fn file_parts(&self) -> FileParts {
		let file_name = self
			.file_name()
			.and_then(|os_str| os_str.try_to_string())
			.unwrap_or_else(|| {
				tracing::warn!(path = ?self, "Failed to get file name");
				String::default()
			});
		let file_stem = self
			.file_stem()
			.and_then(|os_str| os_str.try_to_string())
			.unwrap_or_else(|| {
				tracing::warn!(path = ?self, "Failed to get file stem");
				String::default()
			});
		let extension = self
			.extension()
			.and_then(|os_str| os_str.try_to_string())
			.unwrap_or_else(|| {
				if !self.is_dir() {
					tracing::warn!(path = ?self, "Failed to get file extension");
				}
				String::default()
			});

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

		let FileParts { file_name, .. } = self.file_parts();

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
	//
	// TODO: This will change in the future to allow for unsupported files to
	// be added to the database with *minimal* functionality.
	fn should_ignore(&self) -> bool {
		if self.is_hidden_file() {
			return true;
		}

		!self.is_supported()
	}

	/// Returns true if the file is an image. This is a naive check based on the extension.
	fn is_img(&self) -> bool {
		self.naive_content_type().is_image()
	}

	fn is_thumbnail_img(&self) -> bool {
		if !self.is_img() {
			return false;
		}

		let FileParts { file_stem, .. } = self.file_parts();

		is_accepted_cover_name(&file_stem)
	}

	fn dir_has_media(&self) -> bool {
		if !self.is_dir() {
			return false;
		}

		let read_result = std::fs::read_dir(self);

		match read_result {
			Ok(items) => items
				.filter_map(|item| item.ok())
				.filter(|item| item.path() != self)
				.any(|f| !f.path().should_ignore()),
			Err(e) => {
				error!(
					error = ?e,
					path = ?self,
					"IOError: failed to read directory"
				);
				false
			},
		}
	}

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

#[cfg(test)]
mod tests {
	use std::io::Write;

	use tempfile::TempDir;

	use super::*;

	#[test]
	fn test_read_entire_file() {
		let temp_dir = TempDir::new().unwrap();
		let temp_file = temp_dir.path().join("temp_file.txt");

		File::create(&temp_file)
			.unwrap()
			.write_all(b"Test data")
			.unwrap();

		let data = read_entire_file(&temp_file).unwrap();
		assert_eq!(data, b"Test data");
	}

	#[test]
	fn test_read_entire_file_non_existent() {
		let path = "non_existent_file.txt";
		let result = read_entire_file(path);
		assert!(result.is_err());
	}
}
