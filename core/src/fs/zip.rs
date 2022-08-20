use crate::{
	fs::media_file::{self, GetPageResult, IsImage},
	types::{alias::ProcessResult, errors::ProcessFileError, models::ProcessedMediaFile},
};

use std::{
	fs::File,
	io::{Read, Write},
	path::{Path, PathBuf},
};
use walkdir::WalkDir;
use zip::{read::ZipFile, write::FileOptions};

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

fn zip_dir(
	unpacked_path: &Path,
	zip_path: &Path,
	prefix: &Path,
) -> zip::result::ZipResult<()> {
	let zip_file = std::fs::File::create(&zip_path).unwrap();

	let mut zip_writer = zip::ZipWriter::new(zip_file);

	let options = FileOptions::default()
		.compression_method(zip::CompressionMethod::Stored)
		.unix_permissions(0o755);

	log::trace!("Creating zip file at {:?}", zip_path);

	let mut buffer = Vec::new();
	for entry in WalkDir::new(unpacked_path)
		.into_iter()
		.filter_map(|e| e.ok())
	{
		let path = entry.path();
		let name = path.strip_prefix(Path::new(prefix)).unwrap();

		// Write file or directory explicitly
		// Some unzip tools unzip files with directory paths correctly, some do not!
		if path.is_file() {
			log::trace!("Adding file to zip file: {:?} as {:?}", path, name);
			#[allow(deprecated)]
			zip_writer.start_file_from_path(name, options)?;
			let mut f = File::open(path)?;

			f.read_to_end(&mut buffer)?;
			zip_writer.write_all(&*buffer)?;

			buffer.clear();
		} else if !name.as_os_str().is_empty() {
			// Only if not root! Avoids path spec / warning
			// and mapname conversion failed error on unzip
			log::trace!("Adding directory to zipfile: {:?} as {:?}", path, name);
			#[allow(deprecated)]
			zip_writer.add_directory_from_path(name, options)?;
		} else {
			log::warn!("Please create a bug report! This entry did not meet any of the conditions to be added to the zipfile: {:?}", entry);
		}
	}

	Ok(())
}

pub fn create_zip(
	unpacked_path: &Path,
	name: &str,
	original_ext: &str,
	parent: &Path,
) -> zip::result::ZipResult<PathBuf> {
	let mut ext = "cbz";

	if original_ext != "cbr" {
		ext = "zip";
	}

	log::trace!("Calculated extension for zip file: {}", ext);

	let zip_path = parent.join(format!("{}.{}", name, ext));

	zip_dir(&unpacked_path, &zip_path, unpacked_path)?;

	Ok(zip_path)
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
pub fn process_zip(path: &Path) -> ProcessResult {
	info!("Processing Zip: {}", path.display());

	let zip_file = File::open(path)?;
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
		path: path.to_path_buf(),
		checksum: digest_zip(path.to_str().unwrap()),
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

	use crate::{config::context::Ctx, prisma::media, types::errors::ApiError};

	use rocket::tokio;

	#[tokio::test]
	async fn digest_zips_asynchronous() -> Result<(), ApiError> {
		let ctx = Ctx::mock().await;

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
		let ctx = Ctx::mock().await;

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
