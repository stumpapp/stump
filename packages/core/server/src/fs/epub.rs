use std::{
	fs::File,
	os::unix::prelude::MetadataExt,
	path::{Path, PathBuf},
};

use crate::{
	fs::media_file::{self, GetPageResult},
	types::{
		alias::ProcessResult,
		errors::ProcessFileError,
		models::{MediaMetadata, ProcessedMediaFile},
	},
};
use epub::doc::EpubDoc;
use rocket::http::ContentType;
use walkdir::DirEntry;

use super::{checksum, media_file::get_content_type_from_mime};

pub fn digest_epub(path: &Path, size: u64) -> Option<String> {
	let mut bytes_to_read = size;

	// FIXME: this isn't ideal
	if size > 40000 {
		bytes_to_read = 40000;
	}

	match checksum::digest(path.to_str().unwrap(), bytes_to_read) {
		Ok(digest) => Some(digest),
		Err(e) => {
			log::error!(
				"Failed to digest epub {:?}, unable to create checksum: {}",
				path,
				e
			);
			None
		},
	}
}

fn load_epub(path: &str) -> Result<EpubDoc<File>, ProcessFileError> {
	Ok(EpubDoc::new(path).map_err(|e| ProcessFileError::EpubOpenError(e.to_string()))?)
}

pub fn process_epub(file: &DirEntry) -> ProcessResult {
	log::info!("Processing Epub: {}", file.path().display());

	let path = file.path();

	let epub_file = load_epub(path.to_str().unwrap())?;

	let pages = epub_file.get_num_pages() as i32;

	let metadata: Option<MediaMetadata> = None;

	Ok(ProcessedMediaFile {
		checksum: digest_epub(
			path,
			file.metadata()
				.map_err(|e| {
					log::error!(
						"Failed to get metadata for epub file: {}",
						e.to_string()
					);
					ProcessFileError::EpubReadError(e.to_string())
				})?
				.size(),
		),
		metadata,
		pages,
	})
}

pub fn get_epub_cover(file: &str) -> GetPageResult {
	let mut epub_file = EpubDoc::new(file).map_err(|e| {
		log::error!("Failed to open epub file: {}", e);
		ProcessFileError::EpubOpenError(e.to_string())
	})?;

	// println!("{:?}", epub_file.resources);

	let cover = epub_file.get_cover().map_err(|e| {
		log::error!("Failed to get cover from epub file: {}", e);
		ProcessFileError::EpubReadError(e.to_string())
	})?;

	// FIXME: mime type
	Ok((media_file::get_content_type_from_mime("image/png"), cover))
}

pub fn get_epub_resource(
	path: &str,
	resource_id: &str,
) -> Result<(ContentType, Vec<u8>), ProcessFileError> {
	let mut epub_file = load_epub(path)?;

	let contents = epub_file.get_resource(resource_id).map_err(|e| {
		log::error!("Failed to get resource: {}", e);
		ProcessFileError::EpubReadError(e.to_string())
	})?;

	let content_type = epub_file.get_resource_mime(resource_id).map_err(|e| {
		log::error!("Failed to get resource mime: {}", e);
		ProcessFileError::EpubReadError(e.to_string())
	})?;

	Ok((get_content_type_from_mime(&content_type), contents))
}

pub fn get_epub_resource_from_path(
	path: &str,
	root: &str,
	resource_path: PathBuf,
) -> Result<(ContentType, Vec<u8>), ProcessFileError> {
	let mut epub_file = load_epub(path)?;

	let mut adjusted_path = resource_path;

	if !adjusted_path.starts_with(root) {
		adjusted_path = PathBuf::from(root).join(adjusted_path);
	}

	let contents = epub_file
		.get_resource_by_path(adjusted_path.as_path())
		.map_err(|e| {
			log::error!("Failed to get resource: {}", e);
			ProcessFileError::EpubReadError(e.to_string())
		})?;

	let content_type = epub_file
		.get_resource_mime_by_path(adjusted_path.as_path())
		.map_err(|e| {
			log::error!("Failed to get resource: {}", e);
			ProcessFileError::EpubReadError(e.to_string())
		})?;

	Ok((get_content_type_from_mime(&content_type), contents))
}

// FIXME: error handling here is nasty
pub fn get_epub_page(file: &str, page: i32) -> GetPageResult {
	if page == 1 {
		return get_epub_cover(file);
	}

	let res = EpubDoc::new(file);

	match res {
		Ok(mut doc) => {
			let _ = doc
				.set_current_page(page as usize)
				.map_err(|e| ProcessFileError::EpubReadError(e.to_string()))?;

			let mime_type = doc
				.get_current_mime()
				.map_err(|e| ProcessFileError::EpubReadError(e.to_string()))?;

			let contents = doc
				.get_current()
				.map_err(|e| ProcessFileError::EpubReadError(e.to_string()))?;

			let content_type = media_file::get_content_type_from_mime(&mime_type);

			Ok((content_type, contents))
		},
		Err(e) => Err(ProcessFileError::EpubReadError(e.to_string())),
	}
}

pub fn get_container_xml(file: &str, resource: &str) -> Option<String> {
	let res = EpubDoc::new(file);

	match res {
		Ok(doc) => {
			println!("{:?}", doc.resources);
			doc.resources.get(resource).map(|(_path, s)| s.to_owned())
		},
		Err(_) => unimplemented!(),
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	use crate::{config::context::*, prisma::media, types::models::epub::Epub};
	use rocket::tokio;

	#[tokio::test]
	async fn test() -> anyhow::Result<()> {
		let ctx = Context::mock().await;

		let epubs = ctx
			.db
			.media()
			.find_many(vec![media::extension::equals("epub".to_string())])
			.exec()
			.await?;

		for epub in epubs {
			let epub_file = EpubDoc::new(epub.path.as_str())?;
			println!("{:?}", epub.path);

			println!("Resources: {:?}", epub_file.resources);
			println!("TOC:");

			for content in epub_file.toc {
				println!(
					"\tlabel: {}, content: {:?}, play_order: {}",
					content.label, content.content, content.play_order
				);
			}

			println!("Meta: {:?}", epub_file.metadata);
			println!("root_base: {:?}", epub_file.root_base);
			println!("root_file: {:?}", epub_file.root_file);
			println!("extra_css: {:?}", epub_file.extra_css);

			println!("")
		}

		Ok(())
	}

	// 35a5302d-ad48-4df9-9df7-9c20cc77e6ee

	#[tokio::test]
	async fn test2() -> anyhow::Result<()> {
		let ctx = Context::mock().await;

		let epub = ctx
			.db
			.media()
			.find_unique(media::id::equals(
				"35a5302d-ad48-4df9-9df7-9c20cc77e6ee".to_string(),
			))
			.exec()
			.await?
			.unwrap();

		let epub_file = EpubDoc::new(epub.path.as_str())?;

		let epub = Epub::from(epub, epub_file);

		Ok(())
	}
}
