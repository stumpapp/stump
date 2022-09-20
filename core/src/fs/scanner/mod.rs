use std::path::{Path, PathBuf};

pub mod library;
pub mod utils;

use rocket::http::ContentType;
use walkdir::WalkDir;

use crate::fs::media_file;

// TODO: refactor this trait?
pub trait ScannedFileTrait {
	fn get_kind(&self) -> std::io::Result<Option<infer::Type>>;
	fn is_invisible_file(&self) -> bool;
	fn should_ignore(&self) -> bool;
	fn is_img(&self) -> bool;
	fn is_thumbnail_img(&self) -> bool;
	fn dir_has_media(&self) -> bool;
	fn dir_has_media_deep(&self) -> bool;
}

impl ScannedFileTrait for Path {
	fn get_kind(&self) -> std::io::Result<Option<infer::Type>> {
		infer::get_from_path(self)
	}

	fn is_invisible_file(&self) -> bool {
		self.file_name()
			.unwrap_or_default()
			.to_str()
			.map(|name| name.starts_with("."))
			.unwrap_or(false)
	}

	fn should_ignore(&self) -> bool {
		if self.is_invisible_file() {
			log::debug!("Found hidden file: {}", self.display());
			return true;
		}

		// if self.is_dir() {
		// 	return false;
		// }

		let kind = infer::get_from_path(self);

		if kind.is_err() {
			log::debug!("Could not infer file type for {:?}: {:?}", self, kind);
			return true;
		}

		let kind = kind.unwrap();

		match kind {
			Some(k) => {
				let mime = k.mime_type();

				let content_type = media_file::get_content_type_from_mime(mime);

				// ContentType::Any is basically Stump's fallback. No media should be added that
				// isn't explicitly supported.
				if content_type == ContentType::Any {
					log::debug!(
						"Ignoring file with unknown mime type {}",
						self.display()
					);
					return true;
				}

				false

				// match mime {
				// 	"application/zip" => false,
				// 	"application/vnd.rar" => false,
				// 	"application/epub+zip" => false,
				// 	"application/pdf" => false,
				// 	_ => {
				// 		log::debug!("Ignoring file {:?} with mime type {}", self, mime);
				// 		true
				// 	},
				// }
			},
			None => {
				log::debug!("Unable to infer file type: {:?}", self);
				return true;
			},
		}
	}

	fn is_img(&self) -> bool {
		if let Ok(kind) = infer::get_from_path(self) {
			if let Some(file_type) = kind {
				return file_type.mime_type().starts_with("image/");
			}
		}

		// TODO: more, or refactor. Too lazy rn
		self.extension()
			.map(|ext| {
				ext.eq_ignore_ascii_case("jpg")
					|| ext.eq_ignore_ascii_case("png")
					|| ext.eq_ignore_ascii_case("jpeg")
			})
			.unwrap_or(false)
	}

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

	fn dir_has_media(&self) -> bool {
		if !self.is_dir() {
			return false;
		}

		let items = std::fs::read_dir(self);

		if items.is_err() {
			return false;
		}

		let items = items.unwrap();

		// log::error!("{:?}", items);

		items
			.filter_map(|item| item.ok())
			.filter(|item| item.path() != self)
			.any(|f| !f.path().should_ignore())
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

pub enum BatchScanOperation {
	CreateMedia { path: PathBuf, series_id: String },
	MarkMediaMissing { path: String },
	// Note: this will be tricky. I will need to have this as a separate operation so I don't chance
	// issuing concurrent writes to the database. But will be a bit of a pain, not too bad though.
	// LogFailureEvent { event: CoreEvent },
}
