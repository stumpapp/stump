use rocket::http::ContentType;
use unrar::archive::Entry;
use walkdir::DirEntry;

use crate::{
	fs::media_file::{self, GetPageResult, IsImage},
	types::{alias::ProcessResult, errors::ProcessFileError, models::ProcessedMediaFile},
};

use super::checksum;

impl IsImage for Entry {
	fn is_image(&self) -> bool {
		if self.is_file() {
			let file_name = self.filename.as_path().to_string_lossy().to_lowercase();
			return file_name.ends_with(".jpg")
				|| file_name.ends_with(".jpeg")
				|| file_name.ends_with(".png");
		}

		false
	}
}

pub fn convert_to_cbr() {
	unimplemented!()
}

// TODO: fix error handling after rar changes

/// Processes a rar file in its entirety. Will return a tuple of the comic info and the list of
/// files in the rar.
pub fn process_rar(file: &DirEntry) -> ProcessResult {
	info!("Processing Rar: {}", file.path().display());

	let path = file.path().to_string_lossy().to_string();
	let archive = unrar::Archive::new(&path).unwrap();

	// let mut entries: Vec<String> = Vec::new();
	let mut pages = 0;

	let mut metadata_buf = Vec::<u8>::new();

	let checksum = digest_rar(&path);

	match archive.list_extract() {
		Ok(open_archive) => {
			for entry in open_archive {
				match entry {
					Ok(mut e) => {
						let filename = e.filename.to_string_lossy().to_string();

						if filename.eq("ComicInfo.xml") {
							// FIXME: this won't work. `read_bytes` needs more refactoring.
							metadata_buf = match e.read_bytes() {
								Ok(b) => b,
								Err(_e) => {
									// error!("Error reading metadata: {}", e);
									// todo!()
									vec![]
								},
							}
						} else {
							pages += 1;
						}

						// entries.push(filename);
					},
					Err(_e) => return Err(ProcessFileError::RarReadError),
				}
			}
		},
		Err(_e) => return Err(ProcessFileError::RarOpenError),
	};

	Ok(ProcessedMediaFile {
		checksum,
		metadata: media_file::process_comic_info(
			std::str::from_utf8(&metadata_buf)?.to_owned(),
		),
		pages,
	})
}

pub fn rar_sample(file: &str) -> u64 {
	let archive = unrar::Archive::new(&file).unwrap();

	let entries: Vec<_> = archive
		.list()
		.unwrap()
		.filter_map(|e| e.ok())
		.filter(|e| e.is_image())
		.collect();

	// take first 6 images and add their sizes together
	entries
		.iter()
		.take(6)
		.fold(0, |acc, e| acc + e.unpacked_size as u64)
}

pub fn digest_rar(file: &str) -> Option<String> {
	log::debug!("Attempting to generate checksum for: {}", file);

	let size = rar_sample(file);

	log::debug!(
		"Calculated sample size (in bytes) for generating checksum: {}",
		size
	);

	match checksum::digest(file, size) {
		Ok(digest) => Some(digest),
		Err(e) => {
			log::debug!(
				"Failed to digest rar file: {}. Unable to generate checksum: {}",
				file,
				e
			);

			None
		},
	}
}

// Note: I am sorting by filename after opening, *however* this really is *not* ideal.
// If the files were to have any other naming scheme that would be a problem. Is this a problem?
// TODO: I have to solve the `read_bytes` issue on my unrar fork. For now, I am leaving this very unideal
// solution in place. OpenArchive gets consumed by the iterator, and so when the iterator is done, the
// OpenArchive handle stored in Entry is no more. That's why I create another archive to grab what I want before
// the iterator is done. At least, I *think* that is what is happening.
// Fix location: https://github.com/aaronleopold/unrar.rs/tree/aleopold--read-bytes
pub fn get_rar_image(file: &str, page: i32) -> GetPageResult {
	let archive = unrar::Archive::new(file).unwrap();

	let mut entries: Vec<_> = archive
		.list_extract()
		.unwrap()
		.filter_map(|e| e.ok())
		.filter(|e| e.is_image())
		.collect();

	entries.sort_by(|a, b| a.filename.cmp(&b.filename));

	let entry = entries.into_iter().nth((page - 1) as usize).unwrap();

	let archive = unrar::Archive::new(file).unwrap();

	let bytes = archive
		.list_extract()
		.unwrap()
		.filter_map(|e| e.ok())
		.filter(|e| e.filename == entry.filename)
		.nth(0)
		.unwrap()
		.read_bytes()
		.unwrap();

	Ok((ContentType::JPEG, bytes))
}

#[cfg(test)]
mod tests {
	use super::*;

	use crate::{config::context::Context, prisma::media, types::errors::ApiError};

	use rocket::tokio;

	#[tokio::test]
	async fn digest_rars_asynchronous() -> Result<(), ApiError> {
		let ctx = Context::mock().await;

		let rars = ctx
			.db
			.media()
			.find_many(vec![media::extension::in_vec(vec![
				"rar".to_string(),
				"cbr".to_string(),
			])])
			.exec()
			.await?;

		if rars.len() == 0 {
			println!("Warning: could not run digest_rars_asynchronous test, please insert RAR files in the mock database...");
			return Ok(());
		}

		for rar in rars {
			let rar_sample = rar_sample(&rar.path);

			let checksum = match checksum::digest_async(&rar.path, rar_sample).await {
				Ok(digest) => {
					println!("Generated checksum (async): {:?}", digest);

					Some(digest)
				},
				Err(e) => {
					println!("Failed to digest rar: {}", e);
					None
				},
			};

			assert!(checksum.is_some());
		}

		Ok(())
	}

	#[tokio::test]
	async fn digest_rars_synchronous() -> Result<(), ApiError> {
		let ctx = Context::mock().await;

		let rars = ctx
			.db
			.media()
			.find_many(vec![media::extension::in_vec(vec![
				"rar".to_string(),
				"cbr".to_string(),
			])])
			.exec()
			.await?;

		if rars.len() == 0 {
			println!("Warning: could not run digest_rars_synchronous test, please insert RAR files in the mock database...");
			return Ok(());
		}

		for rar in rars {
			let rar_sample = rar_sample(&rar.path);

			let checksum = match checksum::digest(&rar.path, rar_sample) {
				Ok(digest) => {
					println!("Generated checksum: {:?}", digest);
					Some(digest)
				},
				Err(e) => {
					println!("Failed to digest rar: {}", e);
					None
				},
			};

			assert!(checksum.is_some());
		}

		Ok(())
	}
}
