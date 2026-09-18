use std::fs;
use std::{fs::File, path::Path};

use std::collections::BTreeMap;
use std::io::{Cursor, Read, Seek, Write};
use std::path::PathBuf;
use zip::{result::ZipError, write::SimpleFileOptions, ZipArchive, ZipWriter};

use crate::{
	fs_utils::{FileParts, PathUtils},
	media::processor::{zip::ZipProcessor, MediaProcessorError},
};

/// A function which writes the `metadata_buf` into a new file at `book_path`. The metadata_buf is assumed to
/// be the correct format per the file's corresponding metadata specification.
///
/// Warning: This will overwrite the file at `book_path`
pub fn write_into_zip<P: AsRef<Path>>(
	book_path: P,
	metadata_buf: Vec<u8>,
) -> Result<(), MediaProcessorError> {
	let FileParts { extension, .. } = book_path.as_ref().file_parts();

	let metadata_enclosed_path = if extension == "epub" {
		// EpubProcessor::get_path_to_metadata()
		todo!("implement epub get_path_to_metadata")
	} else {
		ZipProcessor::get_path_to_metadata(
			book_path.as_ref().to_string_lossy().to_string().as_ref(),
		)?
		.unwrap_or_else(|| "ComicInfo.xml".to_string())
	};

	let mut buffer: Vec<u8> = Vec::new();
	let mut zip_writer = ZipWriter::new(Cursor::new(&mut buffer));

	let mut zip_archive = ZipArchive::new(File::open(book_path.as_ref())?)?;
	zip_writer.replace(
		&mut zip_archive,
		BTreeMap::from([(PathBuf::from(metadata_enclosed_path), metadata_buf)]),
	)?;
	zip_writer.finish()?;

	fs::write(book_path, &buffer)?;

	Ok(())
}

/// A trait that provides extra functionality for overwriting a file inside of a ZIP archive in place
/// without needing to decompress any additional contents.
///
/// Derived from https://github.com/PaulmannLighting/smik-jar-tool/tree/main (ty <3)
pub trait UpdateMetadata {
	/// Copies the specified the files from the given [`ZipArchive`] into `self`,
	/// except for the files listed in `exclude`. The exclusion only applies to the
	/// write operation, any valid entry will still return a corresponding [`SimpleFileOptions`]
	/// keyed to its path.
	fn copy_partial<T>(
		&mut self,
		src: &mut ZipArchive<T>,
		exclude: Vec<PathBuf>,
	) -> Result<BTreeMap<PathBuf, SimpleFileOptions>, ZipError>
	where
		T: Read + Seek;

	/// Adds the given files to the [`ZipArchive`] with their respective `options`, if present.
	fn add_files(
		&mut self,
		files: BTreeMap<PathBuf, Vec<u8>>,
		options: BTreeMap<PathBuf, SimpleFileOptions>,
	) -> Result<(), MediaProcessorError>;

	/// Replaces the contents of the given [`ZipArchive`] with the
	/// specified files. It will first call [`Self::copy_partial`] to fill
	/// the new archive based on the existing content.
	fn replace<T>(
		&mut self,
		src: &mut ZipArchive<T>,
		files: BTreeMap<PathBuf, Vec<u8>>,
	) -> Result<(), MediaProcessorError>
	where
		T: Read + Seek,
	{
		let options = self.copy_partial(src, files.keys().cloned().collect())?;
		self.add_files(files, options)?;
		Ok(())
	}
}

impl<W> UpdateMetadata for ZipWriter<W>
where
	W: Write + Seek,
{
	fn copy_partial<T>(
		&mut self,
		src: &mut ZipArchive<T>,
		exclude: Vec<PathBuf>, // e.g., ["ComicInfo.xml"]
	) -> Result<BTreeMap<PathBuf, SimpleFileOptions>, ZipError>
	where
		T: Read + Seek,
	{
		let mut file_buffer = Vec::new();
		let mut options = BTreeMap::new();
		let files: Vec<_> = src.file_names().map(ToOwned::to_owned).collect();

		for file in files {
			let mut entry = src.by_name(&file)?;

			match entry.enclosed_name() {
				Some(path) if exclude.contains(&path) => {
					tracing::debug!(?path, "Excluding file");
					options.insert(path, entry.options());
					continue;
				},
				_ => {},
			}

			if entry.is_file() {
				tracing::debug!(name = entry.name(), "Copying file");
				file_buffer.clear();
				entry.read_to_end(&mut file_buffer)?;
				self.start_file(entry.name(), entry.options())?;
				self.write_all(&file_buffer)?;
			} else if entry.is_dir() {
				tracing::debug!(name = entry.name(), "Creating directory");
				self.add_directory(entry.name(), entry.options())?;
			} else {
				tracing::warn!(entry = entry.name(), "Skipping unsupported entry");
			}
		}

		Ok(options)
	}

	fn add_files(
		&mut self,
		files: BTreeMap<PathBuf, Vec<u8>>,
		mut options: BTreeMap<PathBuf, SimpleFileOptions>,
	) -> Result<(), MediaProcessorError> {
		for (path, contents) in files {
			self.start_file_from_path(&path, options.remove(&path).unwrap_or_default())?;
			self.write_all(&contents)?;
		}
		Ok(())
	}
}

#[cfg(test)]
mod tests {
	use std::fs;

	use crate::{
		media::processor::process_metadata_raw,
		metadata::writer::{tests::get_test_zip_file_data, zip::write_into_zip},
	};

	// does indeed already have ComicInfo.xml
	#[tokio::test]
	async fn test_zip_replace_comic_info() {
		let tempdir = tempfile::tempdir().expect("Failed to create tempdir");
		let temp_zip_file_path = tempdir
			.path()
			.join("book.zip")
			.to_string_lossy()
			.to_string();
		fs::write(&temp_zip_file_path, get_test_zip_file_data())
			.expect("Failed to write temporary zip file");

		let generic_xml = r#"<?xml version="1.0"?>
<ComicInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
    <Title>Invincible 001</Title>
</ComicInfo>"#
			.bytes()
			.collect::<Vec<u8>>();

		write_into_zip(&temp_zip_file_path, generic_xml.clone())
			.expect("Failed to write into zip");

		let updated_xml = process_metadata_raw(&temp_zip_file_path)
			.await
			.expect("Failed to retrieve raw metadata")
			.expect("No metadata found in zip");

		assert_eq!(generic_xml, updated_xml)
	}

	// doesn't already have ComicInfo.xml
	#[tokio::test]
	async fn test_zip_insert_comic_info() {
		let tempdir = tempfile::tempdir().expect("Failed to create tempdir");
		let temp_zip_file_path = tempdir
			.path()
			.join("book-sans-metadata.zip")
			.to_string_lossy()
			.to_string();
		fs::write(&temp_zip_file_path, get_test_zip_file_data())
			.expect("Failed to write temporary zip file");

		let generic_xml = r#"<?xml version="1.0"?>
<ComicInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
    <Title>Invincible 001</Title>
</ComicInfo>"#
			.bytes()
			.collect::<Vec<u8>>();

		write_into_zip(&temp_zip_file_path, generic_xml.clone())
			.expect("Failed to write into zip");

		let updated_xml = process_metadata_raw(&temp_zip_file_path)
			.await
			.expect("Failed to retrieve raw metadata")
			.expect("No metadata found in zip");

		assert_eq!(generic_xml, updated_xml)
	}

	// TODO: test_zip_replace_opf
}
