mod utils;

use std::time::Duration;

use stump_core::{
	db::entity::{
		IgnoreRules, LibraryConfig, LibraryPattern, ReadingDirection,
		ReadingImageScaleFit, ReadingMode,
	},
	filesystem::scanner::LibraryScanJob,
	prisma::media,
};
use utils::temp_library::TempLibrary;

#[tokio::test]
async fn test_scan_collection_library() {
	let (core, temp_dir) = utils::get_temp_core().await;
	let ctx = core.get_context();

	let temp_lib = TempLibrary::collection_library(temp_dir.path()).unwrap();
	let (lib_data, _) = utils::temp_library::create_library(
		ctx.db.clone(),
		temp_lib.get_name(),
		temp_lib.library_root.to_str().unwrap(),
		default_library_config(&temp_lib.pattern),
	)
	.await;

	ctx.enqueue_job(LibraryScanJob::new(lib_data.id, lib_data.path))
		.unwrap();
	// TODO - something less heinous, there must be a way to wait on a job
	tokio::time::sleep(Duration::from_secs(1)).await;

	let items = ctx
		.db
		.media()
		.find_many(vec![media::extension::in_vec(vec![
			"zip".to_string(),
			"cbz".to_string(),
		])])
		.exec()
		.await
		.unwrap();

	assert_ne!(items.len(), 0);
}

#[tokio::test]
async fn test_scan_series_library() {
	let (core, temp_dir) = utils::get_temp_core().await;
	let ctx = core.get_context();

	let temp_lib = TempLibrary::series_library(temp_dir.path()).unwrap();
	let (lib_data, _) = utils::temp_library::create_library(
		ctx.db.clone(),
		temp_lib.get_name(),
		temp_lib.library_root.to_str().unwrap(),
		default_library_config(&temp_lib.pattern),
	)
	.await;

	ctx.enqueue_job(LibraryScanJob::new(lib_data.id, lib_data.path))
		.unwrap();
	// TODO - something less heinous, there must be a way to wait on a job
	tokio::time::sleep(Duration::from_secs(1)).await;

	let items = ctx
		.db
		.media()
		.find_many(vec![media::extension::in_vec(vec![
			"zip".to_string(),
			"cbz".to_string(),
		])])
		.exec()
		.await
		.unwrap();

	assert_ne!(items.len(), 0);
}

fn default_library_config(pattern: &LibraryPattern) -> LibraryConfig {
	LibraryConfig {
		id: None,
		convert_rar_to_zip: false,
		hard_delete_conversions: false,
		generate_file_hashes: true,
		process_metadata: true,
		library_pattern: pattern.clone(),
		thumbnail_config: None,
		default_reading_dir: ReadingDirection::LeftToRight,
		default_reading_mode: ReadingMode::Paged,
		default_reading_image_scale_fit: ReadingImageScaleFit::None,
		ignore_rules: IgnoreRules::new(vec![]).unwrap(),
		library_id: None,
	}
}
