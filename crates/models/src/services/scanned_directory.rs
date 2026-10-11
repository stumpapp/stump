use std::{collections::HashMap, path::Path};

use sea_orm::{prelude::*, ConnectionTrait, DbErr};

use crate::entity::scanned_directory;

#[tracing::instrument(err, skip(conn))]
pub async fn stored_mtimes_under_path(
	path: &str,
	conn: &impl ConnectionTrait,
) -> Result<HashMap<String, u64>, DbErr> {
	let root = Path::new(path);
	let stored_dir_mtimes = scanned_directory::Entity::find()
		.filter(
			scanned_directory::Column::Path
				.starts_with(path.trim_end_matches(['/', '\\'])),
		)
		.all(conn)
		.await
		.unwrap_or_default()
		.into_iter()
		.filter(|record| Path::new(&record.path).starts_with(root))
		.map(|r| (r.path, r.last_mtime as u64))
		.collect::<HashMap<String, u64>>();
	tracing::debug!(
		count = stored_dir_mtimes.len(),
		"Loaded stored directory mtimes"
	);
	Ok(stored_dir_mtimes)
}

#[tracing::instrument(err, skip(conn))]
pub async fn delete_mtimes_under_path(
	path: &str,
	conn: &impl ConnectionTrait,
) -> Result<u64, DbErr> {
	let root = Path::new(path);
	let paths = scanned_directory::Entity::find()
		.filter(
			scanned_directory::Column::Path
				.starts_with(path.trim_end_matches(['/', '\\'])),
		)
		.all(conn)
		.await?
		.into_iter()
		.filter(|record| Path::new(&record.path).starts_with(root))
		.map(|record| record.path)
		.collect::<Vec<_>>();

	if paths.is_empty() {
		return Ok(0);
	}

	let mut deleted_count = 0;

	for chunk in paths.chunks(900) {
		deleted_count += scanned_directory::Entity::delete_many()
			.filter(scanned_directory::Column::Path.is_in(chunk))
			.exec(conn)
			.await?
			.rows_affected;
	}

	Ok(deleted_count)
}
