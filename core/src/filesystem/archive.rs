use std::{
	fs::File,
	io::{Read, Write},
	path::{Path, PathBuf},
};
use tracing::{trace, warn};
use walkdir::WalkDir;
use zip::{write::FileOptions, CompressionMethod};

/// Creates a new zip file at `destination` from the contents of the directory `unpacked_path`.
pub(crate) fn zip_dir(
	unpacked_path: &Path,
	destination: &Path,
	prefix: &Path,
) -> zip::result::ZipResult<()> {
	let zip_file = std::fs::File::create(destination).unwrap();

	let mut zip_writer = zip::ZipWriter::new(zip_file);

	let options: FileOptions<()> = FileOptions::default()
		.compression_method(CompressionMethod::Stored)
		.unix_permissions(0o755);

	trace!("Creating zip file at {:?}", destination);

	let mut buffer = Vec::new();
	for entry in WalkDir::new(unpacked_path)
		.into_iter()
		.filter_map(Result::ok)
	{
		let path = entry.path();
		let name = path.strip_prefix(Path::new(prefix)).unwrap();

		// Write file or directory explicitly
		// Some unzip tools unzip files with directory paths correctly, some do not!
		if path.is_file() {
			trace!("Adding file to zip file: {:?} as {:?}", path, name);
			zip_writer.start_file_from_path(name, options)?;
			let mut f = File::open(path)?;

			f.read_to_end(&mut buffer)?;
			zip_writer.write_all(&buffer)?;

			buffer.clear();
		} else if !name.as_os_str().is_empty() {
			// Only if not root! Avoids path spec / warning
			// and mapname conversion failed error on unzip
			trace!("Adding directory to zipfile: {:?} as {:?}", path, name);
			#[allow(deprecated)]
			zip_writer.add_directory_from_path(name, options)?;
		} else {
			warn!("Please create a bug report! This entry did not meet any of the conditions to be added to the zipfile: {:?}", entry);
		}
	}

	Ok(())
}

/// Creates a zip file from a directory at `unpacked_path` and places it in the
/// `destination` directory with the name `name` and the extension `ext`.
/// Uses [`zip_dir`] to actually create the zip file.
pub fn create_zip_archive(
	unpacked_path: &Path,
	name: &str,
	original_ext: &str,
	destination: &Path,
) -> zip::result::ZipResult<PathBuf> {
	// TODO: does it make sense to leave this ext logic up to the caller?
	let mut ext = "cbz";

	if original_ext != "cbr" {
		ext = "zip";
	}

	trace!("Calculated extension for zip file: {}", ext);

	let zip_path = destination.join(format!("{name}.{ext}"));

	zip_dir(unpacked_path, &zip_path, unpacked_path)?;

	Ok(zip_path)
}

#[cfg(test)]
mod tests {
	use std::fs;

	use tempfile::TempDir;

	use super::*;

	#[test]
	fn test_zip_dir() {
		let temp_dir = TempDir::new().unwrap();
		let unpacked_path = temp_dir.path().join("unpacked");
		let destination = temp_dir.path().join("archive.zip");

		fs::create_dir(&unpacked_path).unwrap();
		File::create(unpacked_path.join("file.txt"))
			.unwrap()
			.write_all(b"Test data")
			.unwrap();

		let res = zip_dir(&unpacked_path, &destination, &unpacked_path);
		assert!(res.is_ok(), "Failed to create zip: {:?}", res.err());

		// Assert the zip file contains the expected content.
		let zip_file = File::open(&destination).unwrap();
		let mut zip_archive = zip::ZipArchive::new(zip_file).unwrap();
		assert_eq!(zip_archive.len(), 1);

		let mut file = zip_archive.by_index(0).unwrap();
		assert_eq!(file.name(), "/file.txt");

		let mut contents = String::new();
		file.read_to_string(&mut contents).unwrap();
		assert_eq!(contents, "Test data");
	}

	#[test]
	fn test_create_zip_archive() {
		let temp_dir = TempDir::new().unwrap();
		let unpacked_path = temp_dir.path().join("unpacked");
		let destination = temp_dir.path();

		fs::create_dir(&unpacked_path).unwrap();

		let res = create_zip_archive(&unpacked_path, "test_archive", "cbr", destination);
		assert!(res.is_ok(), "Failed to create zip archive: {:?}", res.err());
		assert_eq!(res.unwrap().extension().unwrap().to_str().unwrap(), "cbz");

		let res = create_zip_archive(&unpacked_path, "test_archive", "txt", destination);
		assert!(res.is_ok(), "Failed to create zip archive: {:?}", res.err());
		assert_eq!(res.unwrap().extension().unwrap().to_str().unwrap(), "zip");
	}
}
