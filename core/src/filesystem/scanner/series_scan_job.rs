use rayon::iter::{IntoParallelRefIterator, ParallelIterator};
use std::{collections::VecDeque, path::PathBuf};

use serde::{Deserialize, Serialize};

use crate::{
	db::{
		entity::{LibraryOptions, Media},
		FileStatus,
	},
	filesystem::{scanner::utils::create_media, MediaBuilder},
	job::{
		error::JobError, JobDataExt, JobExt, JobRunError, JobTaskOutput, WorkerCtx,
		WorkingState,
	},
	prisma::{library, library_options, media, series, PrismaClient},
	utils::chain_optional_iter,
};

use super::{utils::generate_rule_set, walk_series, WalkedSeries, WalkerCtx};

// TODO: there has to be some sort of nesting of task counts here in order to properly report on the UI.
// For example, I might be on the 3rd task of 5, and within the 3rd task (series scan) I have:
// - 400 files total to index on init
// - 20 new media to create
// - 1 missing media
// I think, logically, the progression on the UI would be something like:
// - Handling task (3/5) - x/400 files indexed
// - Handling task (3/5) - x/20 new media created
// - Handling task (3/5) - x/1 missing media handled
// Or some iteration of that kind of thing. Otherwise, the progression will be SUPER unclear to the user
// with just 3/5, 4/5, 5/5, etc. I think this is a good idea, but I'm not sure how to implement it (yet).

#[derive(Serialize, Deserialize)]
pub enum SeriesScanTask {
	MarkMissingMedia(Vec<PathBuf>),
	CreateMedia(Vec<PathBuf>),
	VisitMedia(Vec<PathBuf>),
}

pub struct SeriesScanJob {
	pub id: String,
	pub path: String,
	pub options: Option<LibraryOptions>,
}

#[derive(Serialize, Deserialize, Default, Debug)]
pub struct SeriesScanData {
	/// The number of files to scan relative to the series root
	total_files: u64,
	created_media: u64,
	updated_media: u64,
}

impl JobDataExt for SeriesScanData {
	fn update(&mut self, updated: Self) {
		self.total_files += updated.total_files;
		self.created_media += updated.created_media;
		self.updated_media += updated.updated_media;
	}
}

#[async_trait::async_trait]
impl JobExt for SeriesScanJob {
	const NAME: &'static str = "series_scan";

	type Data = SeriesScanData;
	type Task = SeriesScanTask;

	async fn init(
		&mut self,
		ctx: &WorkerCtx,
	) -> Result<WorkingState<Self::Data, Self::Task>, JobError> {
		if let Some(restore_point) = self.attempt_restore(ctx).await? {
			// TODO: consider more logging here
			tracing::debug!("Restoring series scan job from save state");
			return Ok(restore_point);
		}

		let mut data = Self::Data::default();
		let library_options = ctx
			.db
			.library_options()
			.find_first(vec![library_options::library::is(vec![
				library::series::some(vec![
					series::id::equals(self.id.clone()),
					series::path::equals(self.path.clone()),
				]),
			])])
			.exec()
			.await?
			.map(LibraryOptions::from)
			.ok_or(JobError::InitFailed(
				"Associated library options not found".to_string(),
			))?;
		let ignore_rules = generate_rule_set(&[PathBuf::from(self.path.clone())]);

		self.options = Some(library_options);

		let WalkedSeries {
			series_is_missing,
			media_to_create,
			media_to_visit,
			missing_media,
			seen_files,
			ignored_files,
		} = walk_series(
			PathBuf::from(self.path.clone()).as_path(),
			WalkerCtx {
				db: ctx.db.clone(),
				ignore_rules,
				max_depth: None,
			},
		)
		.await?;

		if series_is_missing {
			let _ = handle_missing_series(&ctx.db, self.path.as_str()).await;
			return Err(JobError::InitFailed(
				"Series could not be found on disk".to_string(),
			));
		}

		tracing::debug!(
			media_to_create = media_to_create.len(),
			media_to_visit = media_to_visit.len(),
			"Walked series"
		);
		data.total_files = seen_files + ignored_files;

		let tasks = VecDeque::from(chain_optional_iter(
			[],
			[
				missing_media
					.is_empty()
					.then(|| SeriesScanTask::MarkMissingMedia(missing_media)),
				media_to_create
					.is_empty()
					.then(|| SeriesScanTask::CreateMedia(media_to_create)),
				media_to_visit
					.is_empty()
					.then(|| SeriesScanTask::VisitMedia(media_to_visit)),
			],
		));

		Ok(WorkingState {
			data: Some(data),
			tasks,
			current_task_index: 0,
			errors: vec![],
		})
	}

	async fn execute_task(
		&self,
		ctx: &WorkerCtx,
		task: Self::Task,
	) -> Result<JobTaskOutput<Self>, JobError> {
		let mut data = Self::Data::default();
		let mut errors = vec![];

		match task {
			SeriesScanTask::MarkMissingMedia(paths) => {
				let JobTaskOutput {
					data: new_data,
					errors: new_errors,
					..
				} = handle_missing_media(&ctx.db, &self.id, paths, data, errors).await?;
				data = new_data;
				errors = new_errors;
			},
			SeriesScanTask::CreateMedia(paths) => {
				let series_ctx = SeriesCtx {
					id: self.id.clone(),
					path: self.path.clone(),
					library_options: self.options.clone().unwrap(),
					chunk_size: 10,
				};
				let JobTaskOutput {
					data: new_data,
					errors: new_errors,
					..
				} = handle_create_series_media(paths, series_ctx, ctx, data, errors).await?;
				data = new_data;
				errors = new_errors;
			},
			SeriesScanTask::VisitMedia(paths) => {
				unimplemented!()
				// let result = handle_visit_media(&ctx.db, paths, data, errors).await;
				// return result;
			},
		}

		Ok(JobTaskOutput {
			data,
			errors,
			subtasks: vec![],
		})
	}
}

async fn handle_missing_series(
	client: &PrismaClient,
	path: &str,
) -> Result<(), JobError> {
	let affected_rows = client
		.series()
		.update_many(
			vec![series::path::equals(path.to_string())],
			vec![series::status::set(FileStatus::Missing.to_string())],
		)
		.exec()
		.await
		.map_or_else(
			|error| {
				tracing::error!(error = ?error, "Failed to update missing series");
				0
			},
			|count| count,
		);

	if affected_rows > 1 {
		tracing::warn!(
			affected_rows,
			"Updated more than one series with path: {}",
			path
		);
	}

	let _affected_media = client
		.media()
		.update_many(
			vec![media::series::is(vec![series::path::equals(
				path.to_string(),
			)])],
			vec![media::status::set(FileStatus::Missing.to_string())],
		)
		.exec()
		.await
		.map_or_else(
			|error| {
				tracing::error!(error = ?error, "Failed to update missing media");

				0
			},
			|count| count,
		);

	Ok(())
}

// TODO: refactor these to be shared with the library scan job

async fn handle_missing_media(
	client: &PrismaClient,
	series_id: &str,
	media_paths: Vec<PathBuf>,
	mut data: SeriesScanData,
	mut errors: Vec<JobRunError>,
) -> Result<JobTaskOutput<SeriesScanJob>, JobError> {
	if media_paths.is_empty() {
		tracing::debug!("No missing media to handle");
		return Ok(JobTaskOutput {
			data,
			errors,
			subtasks: vec![],
		});
	}

	let _affected_rows = client
		.media()
		.update_many(
			vec![
				media::series::is(vec![series::id::equals(series_id.to_string())]),
				media::path::in_vec(
					media_paths
						.iter()
						.map(|e| e.to_string_lossy().to_string())
						.collect::<Vec<String>>(),
				),
			],
			vec![media::status::set(FileStatus::Missing.to_string())],
		)
		.exec()
		.await
		.map_or_else(
			|error| {
				tracing::error!(error = ?error, "Failed to update missing media");
				errors.push(JobRunError::new(format!(
					"Failed to update missing media: {:?}",
					error.to_string()
				)));
				0
			},
			|count| {
				data.updated_media += count as u64;
				count
			},
		);

	Ok(JobTaskOutput {
		data,
		errors,
		subtasks: vec![],
	})
}

pub struct SeriesCtx {
	id: String,
	path: String,
	library_options: LibraryOptions,
	chunk_size: usize,
}

async fn handle_create_series_media(
	paths: Vec<PathBuf>,
	series_ctx: SeriesCtx,
	ctx: &WorkerCtx,
	mut data: SeriesScanData,
	mut errors: Vec<JobRunError>,
) -> Result<JobTaskOutput<SeriesScanJob>, JobError> {
	if paths.is_empty() {
		tracing::debug!("No media to create for series");
		return Ok(JobTaskOutput {
			data,
			errors,
			subtasks: vec![],
		});
	}

	let SeriesCtx {
		id,
		path,
		library_options,
		chunk_size,
	} = series_ctx;
	tracing::debug!(?path, "Creating media for series");

	let path_chunks = paths.chunks(chunk_size);
	for (idx, chunk) in path_chunks.enumerate() {
		tracing::trace!(chunk_idx = idx, chunk_len = chunk.len(), "Processing chunk");
		let mut built_media = chunk
			.par_iter()
			.map(|path_buf| {
				(
					path_buf.to_owned(),
					MediaBuilder::new(
						path_buf,
						&id,
						library_options.clone(),
						&ctx.config,
					)
					.build(),
				)
			})
			.collect::<VecDeque<(PathBuf, Result<Media, _>)>>();

		while let Some((media_path, build_result)) = built_media.pop_front() {
			match build_result {
				Ok(generated) => {
					// TODO: convert to a transaction!
					match create_media(&ctx.db, generated).await {
						Ok(_created_media) => {
							// TODO: emit event
							data.created_media += 1;
						},
						Err(e) => {
							tracing::error!(error = ?e, ?media_path, "Failed to create media");
							errors.push(JobRunError::new(format!(
								"Failed to create media: {:?}",
								e.to_string()
							)));
						},
					}
				},
				Err(e) => {
					tracing::error!(error = ?e, ?media_path, "Failed to build media");
					errors.push(JobRunError::new(format!(
						"Failed to build media: {:?}",
						e.to_string()
					)));
				},
			}
		}
	}

	Ok(JobTaskOutput {
		data,
		errors,
		subtasks: vec![],
	})
}
