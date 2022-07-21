use crate::{
	fs::media_file::{self, GetPageResult, IsImage},
	types::{alias::ProcessResult, errors::ProcessFileError, models::ProcessedMediaFile},
};

use std::{fs::File, io::Read};
use walkdir::DirEntry;
use zip::read::ZipFile;

use super::checksum;

impl<'a> IsImage for ZipFile<'a> {
	// FIXME: use infer here
	fn is_image(&self) -> bool {
		if self.is_file() {
			let content_type = media_file::guess_content_type(self.name());

			// TODO: is this all??
			return content_type.is_jpeg()
				|| content_type.is_png()
				|| content_type.is_webp()
				|| content_type.is_svg()
				|| content_type.is_tiff();
		}

		false
	}
}

/// Get the sample size (in bytes) to use for generating a checksum of a zip file.
pub fn zip_sample(file: &str) -> u64 {
	let zip_file = File::open(file).unwrap();
	let mut archive = zip::ZipArchive::new(zip_file).unwrap();

	let mut sample_size = 0;

	for i in 0..archive.len() {
		if i > 5 {
			break;
		}

		let file = archive.by_index(i).unwrap();

		sample_size += file.size();
	}

	sample_size
}

/// Calls `checksum::digest` to attempt generating a checksum for the zip file.
pub fn digest_zip(path: &str) -> Option<String> {
	let size = zip_sample(path);

	log::debug!(
		"Calculated sample size (in bytes) for generating checksum: {}",
		size
	);

	match checksum::digest(path, size) {
		Ok(digest) => Some(digest),
		Err(e) => {
			log::error!(
				"Failed to digest zip file {}. Unable to generate checksum: {}",
				path,
				e
			);

			None
		},
	}
}

/// Processes a zip file in its entirety, includes: medatadata, page count, and the
/// generated checksum for the file.
pub fn process_zip(file: &DirEntry) -> ProcessResult {
	info!("Processing Zip: {}", file.path().display());

	let zip_file = File::open(file.path())?;
	let mut archive = zip::ZipArchive::new(zip_file)?;

	let mut comic_info = None;
	// let mut entries = Vec::new();
	let mut pages = 0;

	for i in 0..archive.len() {
		let mut file = archive.by_index(i)?;
		// entries.push(file.name().to_owned());
		if file.name() == "ComicInfo.xml" {
			let mut contents = String::new();
			file.read_to_string(&mut contents)?;
			comic_info = media_file::process_comic_info(contents);
		} else {
			pages += 1;
		}
	}
	// 7054b81b-09f1-48f9-9167-8396ccd57533
	Ok(ProcessedMediaFile {
		checksum: digest_zip(file.path().to_str().unwrap()),
		metadata: comic_info,
		pages,
	})
}

// FIXME: this solution is terrible, was just fighting with borrow checker and wanted
// a quick solve. TODO: rework this!
/// Get an image from a zip file by index (page).
pub fn get_zip_image(file: &str, page: i32) -> GetPageResult {
	let zip_file = File::open(file)?;

	let mut archive = zip::ZipArchive::new(&zip_file)?;
	// FIXME: stinky clone here
	let file_names_archive = archive.clone();

	if archive.len() == 0 {
		log::error!("Zip file {} is empty", file);
		return Err(ProcessFileError::ArchiveEmptyError);
	}

	let mut file_names = file_names_archive.file_names().collect::<Vec<_>>();
	// NOTE: I noticed some zip files *also* come back out of order >:(
	// TODO: look more into this!
	file_names.sort_by(|a, b| a.cmp(b));

	let mut images_seen = 0;
	for name in file_names {
		let mut file = archive.by_name(name)?;

		let mut contents = Vec::new();
		// Note: guessing mime here since this file isn't accessible from the filesystem,
		// it lives inside the zip file.
		let content_type = media_file::guess_content_type(name);

		if images_seen + 1 == page && file.is_image() {
			log::debug!("Found target image: {}", name);
			file.read_to_end(&mut contents)?;
			return Ok((content_type, contents));
		} else if file.is_image() {
			images_seen += 1;
		}
	}

	log::error!(
		"Could not find image for page {} in zip file {}",
		page,
		file
	);

	Err(ProcessFileError::NoImageError)
}

#[cfg(test)]
mod tests {
	use super::*;

	use crate::{config::context::Context, prisma::media, types::errors::ApiError};

	use rocket::tokio;

	#[tokio::test]
	async fn digest_zips_asynchronous() -> Result<(), ApiError> {
		let ctx = Context::mock().await;

		let zips = ctx
			.db
			.media()
			.find_many(vec![media::extension::in_vec(vec![
				"zip".to_string(),
				"cbz".to_string(),
			])])
			.exec()
			.await?;

		if zips.len() == 0 {
			println!("Warning: could not run digest_zips_asynchronous test, please insert RAR files in the mock database...");
			return Ok(());
		}

		for zip in zips {
			let zip_sample = zip_sample(&zip.path);

			let checksum = match checksum::digest_async(&zip.path, zip_sample).await {
				Ok(digest) => {
					println!("Generated checksum (async): {:?}", digest);

					Some(digest)
				},
				Err(e) => {
					println!("Failed to digest zip: {}", e);
					None
				},
			};

			assert!(checksum.is_some());
		}

		Ok(())
	}

	#[tokio::test]
	async fn digest_zips_synchronous() -> Result<(), ApiError> {
		let ctx = Context::mock().await;

		let zips = ctx
			.db
			.media()
			.find_many(vec![media::extension::in_vec(vec![
				"zip".to_string(),
				"cbz".to_string(),
			])])
			.exec()
			.await?;

		if zips.len() == 0 {
			println!("Warning: could not run digest_zips_synchronous test, please insert RAR files in the mock database...");
			return Ok(());
		}

		for zip in zips {
			let zip_sample = zip_sample(&zip.path);

			let checksum = match checksum::digest(&zip.path, zip_sample) {
				Ok(digest) => {
					println!("Generated checksum: {:?}", digest);
					Some(digest)
				},
				Err(e) => {
					println!("Failed to digest zip: {}", e);
					None
				},
			};

			assert!(checksum.is_some());
		}

		Ok(())
	}
}
