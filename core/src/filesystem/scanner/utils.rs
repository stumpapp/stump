use std::{
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
use walkdir::DirEntry;

use crate::{
	db::entity::Media,
	error::{CoreError, CoreResult},
	prisma::{media, media_metadata, series, PrismaClient},
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
