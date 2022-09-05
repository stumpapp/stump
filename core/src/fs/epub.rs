use std::{
	fs::File,
	os::unix::prelude::MetadataExt,
	path::{Path, PathBuf},
};

use crate::types::{
	alias::ProcessFileResult,
	errors::ProcessFileError,
	http,
	models::media::{MediaMetadata, ProcessedMediaFile},
};
use epub::doc::EpubDoc;
use rocket::http::ContentType;

use super::{
	checksum,
	media_file::{self, get_content_type_from_mime},
};

/*
epubcfi usually starts with /6, referring to spine element of package file
file has three groups of elements: metadata, manifest and spine.
*/
// TODO: options: &LibraryOptions
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

fn load_epub(path: &str) -> ProcessFileResult<EpubDoc<File>> {
	Ok(EpubDoc::new(path).map_err(|e| ProcessFileError::EpubOpenError(e.to_string()))?)
}

pub fn process_epub(path: &Path) -> ProcessFileResult<ProcessedMediaFile> {
	log::info!("Processing Epub: {}", path.display());

	let epub_file = load_epub(path.to_str().unwrap())?;

	let pages = epub_file.get_num_pages() as i32;

	let metadata: Option<MediaMetadata> = None;

	Ok(ProcessedMediaFile {
		thumbnail_path: None,
		path: path.to_path_buf(),
		checksum: digest_epub(
			path,
			path.metadata()
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

// TODO: change return type to make more sense
pub fn get_epub_cover(file: &str) -> ProcessFileResult<http::ImageResponse> {
	let mut epub_file = EpubDoc::new(file).map_err(|e| {
		log::error!("Failed to open epub file: {}", e);
		ProcessFileError::EpubOpenError(e.to_string())
	})?;

	let cover = epub_file.get_cover().map_err(|e| {
		log::error!("Failed to get cover from epub file: {}", e);
		ProcessFileError::EpubReadError(e.to_string())
	})?;

	// FIXME: mime type
	Ok((media_file::get_content_type_from_mime("image/png"), cover))
}

pub fn get_epub_chapter(
	path: &str,
	chapter: usize,
) -> ProcessFileResult<(ContentType, Vec<u8>)> {
	let mut epub_file = load_epub(path)?;

	epub_file.set_current_page(chapter).map_err(|e| {
		log::error!("Failed to get chapter from epub file: {}", e);
		ProcessFileError::EpubReadError(e.to_string())
	})?;

	let content = epub_file.get_current_with_epub_uris().map_err(|e| {
		log::error!("Failed to get chapter from epub file: {}", e);
		ProcessFileError::EpubReadError(e.to_string())
	})?;

	let content_type = match epub_file.get_current_mime() {
		Ok(mime) => get_content_type_from_mime(&mime),
		Err(e) => {
			log::warn!(
				"Failed to get explicit definition of resource mime for {}: {}",
				path,
				e
			);

			media_file::guess_content_type("REMOVEME.xhml")
		},
	};

	Ok((content_type, content))
}

pub fn get_epub_resource(
	path: &str,
	resource_id: &str,
) -> ProcessFileResult<(ContentType, Vec<u8>)> {
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

pub fn normalize_resource_path(path: PathBuf, root: &str) -> PathBuf {
	let mut adjusted_path = path;

	if !adjusted_path.starts_with(root) {
		adjusted_path = PathBuf::from(root).join(adjusted_path);
	}

	//  This below won't work since these paths are INSIDE the epub file >:(
	// adjusted_path = adjusted_path.canonicalize().unwrap_or_else(|err| {
	// 	// log::warn!(
	// 	// 	"Failed to safely canonicalize path {}: {}",
	// 	// 	adjusted_path.display(),
	// 	// 	err
	// 	// );

	// 	log::warn!(
	// 		"Failed to safely canonicalize path {}: {}",
	// 		adjusted_path.display(),
	// 		err
	// 	);
	// 	adjusted_path
	// });

	// FIXME: This actually is an invalid solution. If I have multiple '/../../' in the path, this will
	// result in an incorrect path. I'm not worrying about it now, as I don't believe this will even
	// be an issue in the context of epub resources, however once the below linked rust feature is completed
	// I will replace this gross solution.
	let adjusted_str = adjusted_path
		.to_string_lossy()
		.replace("/../", "/")
		.replace("\\..\\", "\\");

	// https://github.com/rust-lang/rust/issues/92750
	// std::path::absolute(adjusted_path);

	PathBuf::from(adjusted_str)
}

pub fn get_epub_resource_from_path(
	path: &str,
	root: &str,
	resource_path: PathBuf,
) -> ProcessFileResult<(ContentType, Vec<u8>)> {
	let mut epub_file = load_epub(path)?;

	let adjusted_path = normalize_resource_path(resource_path, root);

	let contents = epub_file
		.get_resource_by_path(adjusted_path.as_path())
		.map_err(|e| {
			log::error!("Failed to get resource: {}", e);
			ProcessFileError::EpubReadError(e.to_string())
		})?;

	// Note: If the resource does not have an entry in the `resources` map, then loading the content
	// type will fail. This seems to only happen when loading the root file (e.g. container.xml,
	// package.opf, etc.).
	let content_type = match epub_file.get_resource_mime_by_path(adjusted_path.as_path())
	{
		Ok(mime) => get_content_type_from_mime(&mime),
		Err(e) => {
			log::warn!(
				"Failed to get explicit definition of resource mime for {}: {}",
				adjusted_path.as_path().to_str().unwrap(),
				e
			);

			media_file::guess_content_type(adjusted_path.as_path().to_str().unwrap())
		},
	};

	Ok((content_type, contents))
}

#[cfg(test)]
mod tests {

	use super::get_epub_resource;

	use rocket::{http::ContentType, tokio};
	use std::{path::PathBuf, str::FromStr};

	use crate::{config::context::*, prisma::media, types::models::epub::Epub};

	#[tokio::test]
	async fn can_make_epub_struct() -> anyhow::Result<()> {
		let ctx = Ctx::mock().await;

		let media = ctx
			.db
			.media()
			.find_first(vec![media::extension::equals("epub".to_string())])
			.exec()
			.await?;

		if media.is_none() {
			// No epub file found, this is not a failure. Just skip the test.
			return Ok(());
		}

		let media = media.unwrap();

		let epub = Some(Epub::try_from(media)?);

		assert!(epub.is_some());

		Ok(())
	}

	#[tokio::test]
	async fn can_get_resource() -> anyhow::Result<()> {
		let ctx = Ctx::mock().await;

		let media = ctx
			.db
			.media()
			.find_first(vec![media::extension::equals("epub".to_string())])
			.exec()
			.await?;

		if media.is_none() {
			// No epub file found, this is not a failure. Just skip the test.
			return Ok(());
		}

		let media = media.unwrap();
		let media_path = media.path.clone();

		let epub = Epub::try_from(media)?;

		let first_resource = epub.resources.into_iter().next().unwrap();

		let got_resource = get_epub_resource(&media_path, &first_resource.0);

		assert!(got_resource.is_ok());

		let got_resource = got_resource.unwrap();

		assert_eq!(
			got_resource.0,
			ContentType::from_str(&first_resource.1 .1)
				.expect("Could not determine content type")
		);

		Ok(())
	}

	#[test]
	fn canonical_correction() {
		let invalid = PathBuf::from("OEBPS/../Styles/style.css");

		let expected = PathBuf::from("OEBPS/Styles/style.css");

		let result = super::normalize_resource_path(invalid, "OEBPS");

		assert_eq!(result, expected);
	}

	#[tokio::test]
	async fn can_get_chapter() -> anyhow::Result<()> {
		let ctx = Ctx::mock().await;

		let media = ctx
			.db
			.media()
			.find_first(vec![media::extension::equals("epub".to_string())])
			.exec()
			.await?;

		if media.is_none() {
			// No epub file found, this is not a failure. Just skip the test.
			return Ok(());
		}

		let media = media.unwrap();

		let result = super::get_epub_chapter(&media.path, 4)?;

		println!("{:?}", result);

		assert!(result.1.len() > 0);

		Ok(())
	}
}
