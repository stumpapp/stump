use std::path::Path;

pub mod library;
pub mod utils;

use rocket::http::ContentType;

use crate::fs::media_file;

#[async_trait::async_trait]
pub trait ScannerJob {
	// async fn precheck() -> Result<T, ApiError>;
	async fn scan(&mut self);
}

pub trait ScannedFileTrait {
	fn get_kind(&self) -> std::io::Result<Option<infer::Type>>;
	fn is_invisible_file(&self) -> bool;
	fn should_ignore(&self) -> bool;
	fn dir_has_media(&self) -> bool;
}

impl ScannedFileTrait for Path {
	fn get_kind(&self) -> std::io::Result<Option<infer::Type>> {
		infer::get_from_path(self)
	}

	fn is_invisible_file(&self) -> bool {
		let filename = self
			.file_name()
			.unwrap_or_default()
			.to_str()
			.expect(format!("Malformed filename: {:?}", self.as_os_str()).as_str());

		filename.starts_with(".")
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
}
