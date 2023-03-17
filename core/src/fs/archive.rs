use std::{
	fs::File,
	io::{Read, Write},
	path::{Path, PathBuf},
};
use tracing::{trace, warn};
use walkdir::WalkDir;
use zip::write::FileOptions;

/// Creates a new zip file at `destination` from the contents of the folder `unpacked_path`.
pub(crate) fn zip_dir(
	unpacked_path: &Path,
	destination: &Path,
	prefix: &Path,
) -> zip::result::ZipResult<()> {
	let zip_file = std::fs::File::create(destination).unwrap();

	let mut zip_writer = zip::ZipWriter::new(zip_file);

	let options = FileOptions::default()
		.compression_method(zip::CompressionMethod::Stored)
		.unix_permissions(0o755);

	trace!("Creating zip file at {:?}", destination);

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
			trace!("Adding file to zip file: {:?} as {:?}", path, name);
			#[allow(deprecated)]
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

	let zip_path = destination.join(format!("{}.{}", name, ext));

	zip_dir(unpacked_path, &zip_path, unpacked_path)?;

	Ok(zip_path)
}
