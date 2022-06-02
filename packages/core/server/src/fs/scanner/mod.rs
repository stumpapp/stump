use std::path::Path;

pub mod library;
pub mod utils;

#[async_trait::async_trait]
pub trait ScannerJob {
	// async fn precheck() -> Result<T, ApiError>;
	async fn scan(&mut self);
}

pub trait ScannedFileTrait {
	fn get_kind(&self) -> std::io::Result<Option<infer::Type>>;
	fn is_visible_file(&self) -> bool;
	fn should_ignore(&self) -> bool;
	fn dir_has_media(&self) -> bool;
}

impl ScannedFileTrait for Path {
	fn get_kind(&self) -> std::io::Result<Option<infer::Type>> {
		infer::get_from_path(self)
	}

	fn is_visible_file(&self) -> bool {
		let filename = self
			.file_name()
			.unwrap_or_default()
			.to_str()
			.expect(format!("Malformed filename: {:?}", self.as_os_str()).as_str());

		if self.is_dir() {
			return false;
		} else if filename.starts_with(".") {
			return false;
		}

		true
	}

	fn should_ignore(&self) -> bool {
		if !self.is_visible_file() {
			log::info!("Ignoring hidden file: {}", self.display());
			return true;
		}

		let kind = infer::get_from_path(self);

		if kind.is_err() {
			log::info!("Could not infer file type for {:?}: {:?}", self, kind);
			return true;
		}

		let kind = kind.unwrap();

		match kind {
			Some(k) => {
				let mime = k.mime_type();

				match mime {
					"application/zip" => false,
					"application/vnd.rar" => false,
					"application/epub+zip" => false,
					"application/pdf" => false,
					_ => {
						log::info!("Ignoring file {:?} with mime type {}", self, mime);
						true
					},
				}
			},
			None => {
				log::info!("Unable to infer file type: {:?}", self);
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

		items
			.filter_map(|item| item.ok())
			.any(|f| !f.path().should_ignore())
	}
}
