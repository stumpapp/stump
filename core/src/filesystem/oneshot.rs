use models::{
	entity::{library_config, series},
	shared::enums::FileStatus,
};
use sea_orm::Set;
use std::path::Path;
use tokio::task::spawn_blocking;
use uuid::Uuid;

use crate::{
	config::StumpConfig,
	filesystem::{
		media::{BuiltMedia, MediaBuilder},
		series::BuiltSeries,
		FileParts, PathUtils,
	},
	CoreError, CoreResult,
};

pub struct BuiltOneshot {
	pub series: BuiltSeries,
	pub media: BuiltMedia,
}

pub(crate) fn build_oneshot_blocking<P: AsRef<Path>>(
	path: P,
	library_id: &str,
	library_config: library_config::Model,
	core_config: &StumpConfig,
) -> CoreResult<BuiltOneshot> {
	let path = path.as_ref();
	let FileParts {
		file_stem: name, ..
	} = path.file_parts();

	let id = Uuid::new_v4();
	// ^ we set id early to share with book
	let series = series::ActiveModel {
		id: Set(id.to_string()),
		path: Set(path.to_string_lossy().to_string()),
		name: Set(name),
		library_id: Set(Some(library_id.to_string())),
		is_oneshot: Set(true),
		status: Set(FileStatus::Ready),
		..Default::default()
	};

	let series = BuiltSeries {
		series,
		// TODO: do we need to read media metadata for this?
		metadata: None,
	};

	let media =
		MediaBuilder::new(path, &id.to_string(), library_config, core_config).build()?;

	Ok(BuiltOneshot { series, media })
}

pub(crate) async fn build_oneshot<P: AsRef<Path>>(
	path: P,
	library_id: &str,
	library_config: library_config::Model,
	core_config: StumpConfig,
) -> CoreResult<BuiltOneshot> {
	let path_buf = path.as_ref().to_path_buf();
	let library_id = library_id.to_string();
	spawn_blocking(move || {
		build_oneshot_blocking(
			&path_buf,
			library_id.as_str(),
			library_config,
			&core_config,
		)
	})
	.await
	.map_err(|e| CoreError::Unknown(e.to_string()))?
}
