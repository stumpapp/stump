mod media;
mod oneshot;
mod series;

use std::{
	path::{Path, PathBuf},
	time::UNIX_EPOCH,
};

use chrono::{DateTime, Utc};
use futures::{future::BoxFuture, stream::FuturesUnordered};
use globset::GlobSet;
use models::entity::library_config;
use sea_orm::prelude::*;
use walkdir::DirEntry;

use crate::{error::CoreError, job::error::JobError};

pub(crate) use media::{
	build_and_insert_media, handle_missing_media, handle_restored_media,
	visit_and_update_media, MediaBuildOperation, MediaOperationOutput,
};
pub(crate) use oneshot::{build_and_insert_oneshots, OneshotOperationOutput};
pub(crate) use series::{
	handle_missing_series, insert_series, safely_build_series, MissingSeriesOutput,
};

const MAX_INSERT_CHUNK_SIZE: usize = 250;

/// A type alias for the unordered stream of futures returned by concurernt builds of
/// managed entities
type BuiltEntityFutures<T, R = PathBuf> =
	FuturesUnordered<BoxFuture<'static, Result<T, (CoreError, R)>>>;

/// A simple helper that takes an optional library config and builds the ignore rules from it
pub(crate) fn build_ignore_rules(
	config: &Option<library_config::Model>,
) -> Result<GlobSet, JobError> {
	let Some(ref config) = config else {
		tracing::error!("Config is missing!");
		return Err(JobError::TaskFailed(
			"A critical error occurred while attempting to scan the library".to_string(),
		));
	};
	match config.ignore_rules().build() {
		Ok(rules) => Ok(rules),
		Err(err) => {
			tracing::error!(error = ?err, "Failed to build ignore rules");
			Err(JobError::TaskFailed(
				"Failed to build ignore rules. Check that the rules are valid."
					.to_string(),
			))
		},
	}
}

/// Checks whether the given mtime is newer than the last modified date of the media, which
/// itself is derived from the mtime last it was scanned
pub(crate) fn mtime_newer_than_datetime(
	mtime: u64,
	last_modified_at: &DateTimeWithTimeZone,
) -> bool {
	let last_modified_at_secs = last_modified_at.timestamp() as u64;
	mtime > last_modified_at_secs
}

/// Checks whether the given [DirEntry] has been updated since the last scan, used for any
/// walker-based fns. if not using a walker, e.g., for oneshots, use [mtime_newer_than_datetime] instead
pub(crate) fn file_updated_since_scan(
	entry: &DirEntry,
	last_modified_at: &DateTimeWithTimeZone,
) -> bool {
	if let Ok(Ok(system_time)) = entry.metadata().map(|m| m.modified()) {
		let system_time_converted: DateTime<Utc> = system_time.into();
		let media_modified_at = last_modified_at.with_timezone(&Utc);
		tracing::trace!(?system_time_converted, ?media_modified_at);
		system_time_converted > media_modified_at
	} else {
		tracing::error!(
			path = ?entry.path(),
			"Error occurred trying to read modified date for media",
		);
		true
	}
}

/// Will attempt to get the mtime of the file at the given path, and returning 0
/// if it fails for any reason (since the failure itself is not critical here). if it
/// is critical to understand the failure reason, do not use this helper
pub(crate) async fn safely_get_current_mtime<T: AsRef<Path>>(path: T) -> u64 {
	match tokio::fs::metadata(path).await {
		Ok(metadata) => metadata
			.modified()
			.unwrap_or(UNIX_EPOCH)
			.duration_since(UNIX_EPOCH)
			.unwrap_or_default()
			.as_secs(),
		Err(error) => {
			tracing::error!(?error, "Failed to get metadata for path");
			0
		},
	}
}

// TODO(tests): sort out tests later. I had to remove them for now because
// mocking apalis state and all that was too much
