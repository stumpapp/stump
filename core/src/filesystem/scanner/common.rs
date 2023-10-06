use globset::{Glob, GlobSetBuilder};
use std::{
	fs::File,
	io::{BufRead, BufReader},
	path::PathBuf,
};
use tracing::error;

use crate::db::entity::Media;

// FIXME: I don't want to allow this, however Box<Media> won't work
#[allow(clippy::large_enum_variant)]
pub enum BatchScanOperation {
	CreateMedia { path: PathBuf, series_id: String },
	InsertMedia(Media),
	UpdateMedia(Media),
	MarkMediaMissing { path: String },
	// Note: this will be tricky. I will need to have this as a separate operation so I don't chance
	// issuing concurrent writes to the database. But will be a bit of a pain, not too bad though.
	// LogFailureEvent { event: CoreEvent },
}

pub fn populate_glob_builder(builder: &mut GlobSetBuilder, paths: &[PathBuf]) {
	for path in paths {
		let open_result = File::open(path);
		if let Ok(file) = open_result {
			// read the lines of the file, and add each line as a glob pattern in the builder
			for line in BufReader::new(file).lines() {
				if let Err(e) = line {
					error!(
						error = ?e,
						"Error occurred trying to read line from glob file",
					);
					continue;
				}

				builder.add(Glob::new(&line.unwrap()).unwrap());
			}
		} else {
			error!(
				error = ?open_result.err(),
				?path,
				"Failed to open file",
			);
		}
	}
}
