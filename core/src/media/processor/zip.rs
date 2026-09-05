use std::{collections::HashMap, fs::File, path::Path};

use zip::ZipArchive;

use crate::{
	fs_utils::{
		hash::{self, generate_koreader_hash},
		ContentType,
	},
	media::processor::{
		error::MediaProcessorError, GeneratedFileHashes, MediaProcessor,
		MediaProcessorOptions,
	},
};

pub struct ZipProcessor;

impl MediaProcessor for ZipProcessor {
	fn generate_stump_hash(path: &Path) -> Result<String, MediaProcessorError> {
		let zip_file = File::open(path)?;
		let mut archive = ZipArchive::new(zip_file)?;

		let mut sample_size = 0;

		for i in 0..archive.len() {
			if i > 5 {
				break;
			}

			if let Ok(file) = archive.by_index(i) {
				sample_size += file.size();
			}
		}

		Ok(hash::generate(path, sample_size)?)
	}

	fn generate_hashes(
		path: &Path,
		MediaProcessorOptions {
			generate_file_hashes,
			generate_koreader_hashes,
			..
		}: MediaProcessorOptions,
	) -> Result<GeneratedFileHashes, MediaProcessorError> {
		let stump_hash = generate_file_hashes
			.then(|| ZipProcessor::generate_stump_hash(path))
			.transpose()?;
		// TODO(koreader): should confirm whether we care about generating for
		// zip files, or just keep it for epubs
		let koreader_hash = generate_koreader_hashes
			.then(|| generate_koreader_hash(path))
			.transpose()?;

		Ok(GeneratedFileHashes {
			stump: stump_hash,
			koreader: koreader_hash,
		})
	}

	fn process_metadata(
		path: &Path,
		// TODO: sort that out
		// ) -> Result<Option<ProcessedMediaMetadata>, MediaProcessorError>;
	) -> Result<Option<()>, MediaProcessorError> {
		todo!()
	}

	fn process(
		path: &Path,
		options: MediaProcessorOptions,
	) -> Result<(), MediaProcessorError> {
		todo!()
	}

	fn get_page(
		path: &Path,
		page: i32,
		// config: &StumpConfig,
	) -> Result<(ContentType, Vec<u8>), MediaProcessorError> {
		todo!()
	}

	fn get_page_count(path: &Path) -> Result<i32, MediaProcessorError> {
		todo!()
	}

	fn get_page_content_types(
		path: &Path,
		pages: Vec<i32>,
	) -> Result<HashMap<i32, ContentType>, MediaProcessorError> {
		todo!()
	}
}
