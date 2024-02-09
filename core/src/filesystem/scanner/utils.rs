use std::{
	collections::VecDeque,
	fs::File,
	io::{BufRead, BufReader},
	path::PathBuf,
};

use globset::{Glob, GlobSet, GlobSetBuilder};
use itertools::Itertools;
use prisma_client_rust::{
	chrono::{DateTime, Utc},
	QueryError,
};
use rayon::iter::{IntoParallelRefIterator, ParallelIterator};
use walkdir::DirEntry;

use crate::{
	db::{
		entity::{LibraryOptions, Media},
		FileStatus,
	},
	error::{CoreError, CoreResult},
	filesystem::MediaBuilder,
	job::{error::JobError, JobExecuteLog, JobProgress, WorkerCtx, WorkerSendExt},
	prisma::{media, media_metadata, series, PrismaClient},
	CoreEvent,
};

pub(crate) fn file_updated_since_scan(
	entry: &DirEntry,
	last_modified_at: String,
) -> CoreResult<bool> {
	if let Ok(Ok(system_time)) = entry.metadata().map(|m| m.modified()) {
		let media_modified_at =
			last_modified_at.parse::<DateTime<Utc>>().map_err(|e| {
				tracing::error!(
					path = ?entry.path(),
					error = ?e,
					"Error occurred trying to read modified date for media",
				);

				CoreError::Unknown(e.to_string())
			})?;
		let system_time_converted: DateTime<Utc> = system_time.into();
		tracing::trace!(?system_time_converted, ?media_modified_at,);

		if system_time_converted > media_modified_at {
			return Ok(true);
		}

		Ok(false)
	} else {
		tracing::error!(
			path = ?entry.path(),
			"Error occurred trying to read modified date for media",
		);

		Ok(true)
	}
}

// TODO: should probably return result as to not scan files which the user would like to ignore
pub(crate) fn generate_rule_set(paths: &[PathBuf]) -> GlobSet {
	let mut builder = GlobSetBuilder::new();

	let adjusted_paths = paths
		.iter()
		// We have to remove duplicates here otherwise the glob will double some patterns.
		// An example would be when the library has media in root. Not the end of the world.
		.unique()
		.filter(|p| p.exists())
		.collect::<Vec<_>>();

	tracing::trace!(?adjusted_paths, "Adjusted paths");

	for path in adjusted_paths {
		let ignore_file = path.join(".stumpignore");
		let open_result = File::open(&ignore_file);
		if let Ok(file) = open_result {
			// read the lines of the file, and add each line as a glob pattern in the builder
			for line in BufReader::new(file).lines() {
				if let Err(e) = line {
					tracing::error!(
						?ignore_file,
						error = ?e,
						"Error occurred trying to read line from glob file",
					);
					continue;
				}

				// TODO: remove unwraps!
				builder.add(Glob::new(&line.unwrap()).unwrap());
			}
		} else {
			tracing::warn!(
				error = ?open_result.err(),
				?ignore_file,
				"Failed to open file (does it exist?)",
			);
		}
	}

	builder.build().unwrap_or_default()
}

pub(crate) async fn create_media(
	db: &PrismaClient,
	generated: Media,
) -> CoreResult<Media> {
	let result: Result<Media, QueryError> = db
		._transaction()
		.run(|client| async move {
			let created_metadata = if let Some(metadata) = generated.metadata {
				let params = metadata.into_prisma();
				let created_metadata =
					client.media_metadata().create(params).exec().await?;
				tracing::trace!(?created_metadata, "Metadata inserted");
				Some(created_metadata)
			} else {
				tracing::trace!("No metadata to insert");
				None
			};

			let created_media = client
				.media()
				.create(
					generated.name,
					generated.size,
					generated.extension,
					generated.pages,
					generated.path,
					vec![
						media::hash::set(generated.hash),
						media::series::connect(series::id::equals(generated.series_id)),
					],
				)
				.exec()
				.await?;
			tracing::trace!(?created_media, "Media inserted");

			if let Some(media_metadata) = created_metadata {
				let updated_media = client
					.media()
					.update(
						media::id::equals(created_media.id),
						vec![media::metadata::connect(media_metadata::id::equals(
							media_metadata.id,
						))],
					)
					.with(media::metadata::fetch())
					.exec()
					.await?;
				tracing::trace!("Media updated with metadata");
				Ok(Media::from(updated_media))
			} else {
				Ok(Media::from(created_media))
			}
		})
		.await;

	Ok(result?)
}

pub(crate) async fn update_media(db: &PrismaClient, media: Media) -> CoreResult<Media> {
	let result: Result<Media, QueryError> = db
		._transaction()
		.run(|client| async move {
			if let Some(metadata) = media.metadata {
				let params = metadata.into_prisma();
				let updated_metadata = client
					.media_metadata()
					.update(media_metadata::media_id::equals(media.id.clone()), params)
					.exec()
					.await?;
				tracing::trace!(?updated_metadata, "Metadata updated");
			}

			let updated_media = client
				.media()
				.update(
					media::id::equals(media.id.clone()),
					vec![
						media::name::set(media.name.clone()),
						media::size::set(media.size),
						media::extension::set(media.extension.clone()),
						media::pages::set(media.pages),
						media::hash::set(media.hash.clone()),
						media::path::set(media.path.clone()),
						media::status::set(media.status.to_string()),
					],
				)
				.with(media::metadata::fetch())
				.exec()
				.await?;
			tracing::trace!(?updated_media, "Media updated");

			Ok(Media::from(updated_media))
		})
		.await;

	Ok(result?)
}

#[derive(Default)]
pub(crate) struct MediaOperationOutput {
	pub created_media: u64,
	pub updated_media: u64,
	pub logs: Vec<JobExecuteLog>,
}

pub(crate) async fn handle_missing_media(
	ctx: &WorkerCtx,
	series_id: &str,
	paths: Vec<PathBuf>,
) -> MediaOperationOutput {
	let mut output = MediaOperationOutput::default();

	if paths.is_empty() {
		tracing::debug!("No missing media to handle");
		return output;
	}

	let _affected_rows = ctx
		.db
		.media()
		.update_many(
			vec![
				media::series::is(vec![series::id::equals(series_id.to_string())]),
				media::path::in_vec(
					paths
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
				output.logs.push(JobExecuteLog::error(format!(
					"Failed to update missing media: {:?}",
					error.to_string()
				)));
				0
			},
			|count| {
				output.updated_media += count as u64;
				count
			},
		);

	output
}

pub(crate) struct MediaBuildOperationCtx {
	pub series_id: String,
	pub library_options: LibraryOptions,
	pub chunk_size: usize,
}

pub(crate) async fn handle_create_media(
	build_ctx: MediaBuildOperationCtx,
	worker_ctx: &WorkerCtx,
	paths: Vec<PathBuf>,
) -> Result<MediaOperationOutput, JobError> {
	if paths.is_empty() {
		tracing::debug!("No media to create");
		return Ok(MediaOperationOutput::default());
	}

	let mut output = MediaOperationOutput::default();
	let MediaBuildOperationCtx {
		series_id,
		library_options,
		chunk_size,
	} = build_ctx;

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
						&series_id,
						library_options.clone(),
						&worker_ctx.config,
					)
					.build(),
				)
			})
			.collect::<VecDeque<(PathBuf, Result<Media, _>)>>();

		while let Some((media_path, build_result)) = built_media.pop_front() {
			let Ok(generated) = build_result else {
				tracing::error!(?media_path, "Failed to build media");
				output.logs.push(
					JobExecuteLog::error(format!(
						"Failed to build media: {:?}",
						build_result.unwrap_err().to_string()
					))
					.with_ctx(media_path.to_string_lossy().to_string()),
				);
				continue;
			};

			match create_media(&worker_ctx.db, generated).await {
				Ok(created_media) => {
					output.created_media += 1;
					worker_ctx.send_batch(vec![
						JobProgress::msg(
							format!("Inserted {}", media_path.display()).as_str(),
						)
						.into_send(),
						CoreEvent::CreatedMedia {
							id: created_media.id,
							series_id: series_id.clone(),
						}
						.into_send(),
					]);
				},
				Err(e) => {
					tracing::error!(error = ?e, ?media_path, "Failed to create media");
					output.logs.push(
						JobExecuteLog::error(format!(
							"Failed to create media: {:?}",
							e.to_string()
						))
						.with_ctx(media_path.to_string_lossy().to_string()),
					);
				},
			}
		}
	}

	Ok(output)
}

pub(crate) async fn handle_visit_media(
	build_ctx: MediaBuildOperationCtx,
	worker_ctx: &WorkerCtx,
	paths: Vec<PathBuf>,
) -> Result<MediaOperationOutput, JobError> {
	if paths.is_empty() {
		tracing::debug!("No media to visit");
		return Ok(MediaOperationOutput::default());
	}

	let mut output = MediaOperationOutput::default();
	let MediaBuildOperationCtx {
		series_id,
		library_options,
		chunk_size,
	} = build_ctx;
	let client = &worker_ctx.db;

	let media = client
		.media()
		.find_many(vec![
			media::path::in_vec(
				paths
					.iter()
					.map(|e| e.to_string_lossy().to_string())
					.collect::<Vec<String>>(),
			),
			media::series_id::equals(Some(series_id.clone())),
		])
		.exec()
		.await?
		.into_iter()
		.map(Media::from)
		.collect::<Vec<Media>>();

	if media.len() != paths.len() {
		output.logs.push(JobExecuteLog::warn(
			"Not all media paths were found in the database",
		));
	}

	let chunks = media.chunks(chunk_size);

	for (idx, chunk) in chunks.enumerate() {
		tracing::trace!(chunk_idx = idx, chunk_len = chunk.len(), "Processing chunk");
		let mut built_media = chunk
			.par_iter()
			.map(|m| {
				MediaBuilder::new(
					PathBuf::from(m.path.as_str()).as_path(),
					&series_id,
					library_options.clone(),
					&worker_ctx.config,
				)
				.rebuild(m)
			})
			.collect::<VecDeque<Result<Media, _>>>();

		while let Some(build_result) = built_media.pop_front() {
			match build_result {
				Ok(generated) => {
					tracing::warn!(
						"Stump currently has minimal support for updating media",
					);
					match update_media(client, generated).await {
						Ok(updated_media) => {
							tracing::trace!(?updated_media, "Updated media");
							// TODO: emit event
							output.updated_media += 1;
						},
						Err(e) => {
							tracing::error!(error = ?e, "Failed to update media");
							output.logs.push(JobExecuteLog::error(format!(
								"Failed to update media: {:?}",
								e.to_string()
							)));
						},
					}
				},
				Err(e) => {
					tracing::error!(error = ?e, "Failed to build media");
					output.logs.push(JobExecuteLog::error(format!(
						"Failed to build media: {:?}",
						e.to_string()
					)));
				},
			}
		}
	}

	Ok(output)
}
