use std::{collections::HashMap, path::Path};

use globset::{GlobSet, GlobSetBuilder};
use itertools::Itertools;
use walkdir::WalkDir;

use crate::{
	db::entity::{LibraryOptions, Media, Series},
	job::WorkerCtx,
	prisma::media,
	CoreResult, Ctx,
};

use super::utils::populate_glob_builder;

pub struct SeriesScanner {
	path: String,
	worker_ctx: WorkerCtx,
}

impl SeriesScanner {
	pub fn new(path: String, worker_ctx: WorkerCtx) -> Self {
		Self { path, worker_ctx }
	}

	fn setup(&self) -> CoreResult<SeriesSetup> {
		unimplemented!()
	}
}

pub struct SeriesSetup {
	pub visited_media: HashMap<String, bool>,
	pub media_by_path: HashMap<String, Media>,
	pub walkdir: WalkDir,
	pub glob_set: GlobSet,
}

pub(crate) async fn setup_series(
	ctx: &Ctx,
	series: &Series,
	library_path: &str,
	library_options: &LibraryOptions,
) -> SeriesSetup {
	let series_ignore_file = Path::new(series.path.as_str()).join(".stumpignore");
	let library_ignore_file = Path::new(library_path).join(".stumpignore");

	let media = ctx
		.db
		.media()
		.find_many(vec![media::series_id::equals(Some(series.id.clone()))])
		.exec()
		.await
		.unwrap_or_else(|e| {
			tracing::error!(error = ?e, "Error occurred trying to fetch media for series");
			vec![]
		});

	let mut visited_media = HashMap::with_capacity(media.len());
	let mut media_by_path = HashMap::with_capacity(media.len());
	for m in media {
		visited_media.insert(m.path.clone(), false);
		media_by_path.insert(m.path.clone(), Media::from(m));
	}

	let mut walkdir = WalkDir::new(&series.path);
	let is_collection_based = library_options.is_collection_based();

	if !is_collection_based || series.path == library_path {
		walkdir = walkdir.max_depth(1);
	}

	let mut builder = GlobSetBuilder::new();
	if series_ignore_file.exists() || library_ignore_file.exists() {
		populate_glob_builder(
			&mut builder,
			vec![series_ignore_file, library_ignore_file]
				.into_iter()
				// We have to remove duplicates here otherwise the glob will double some patterns.
				// An example would be when the library has media in root. Not the end of the world.
				.unique()
				.filter(|p| p.exists())
				.collect::<Vec<_>>()
				.as_slice(),
		);
	}

	// TODO: make this an error to enforce correct glob patterns in an ignore file.
	// This way, no scan will ever add things a user wants to ignore.
	let glob_set = builder.build().unwrap_or_default();

	SeriesSetup {
		visited_media,
		media_by_path,
		walkdir,
		glob_set,
	}
}
