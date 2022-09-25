use rocket::tokio;

mod setup;

use setup::initialize;
use stump_core::{
	config::Ctx,
	fs::scanner::library::scan_batch,
	prisma::{library, library_options},
};

#[tokio::test]
async fn series_based_library_batch_scan() {
	initialize();

	let test_ctx = Ctx::mock().await;

	let client = test_ctx.get_db();

	let library_path = setup::get_test_data_dir().join("series-based-library");

	let library_options_result = client
		.library_options()
		.create(vec![library_options::library_pattern::set(
			"SERIES_BASED".into(),
		)])
		.exec()
		.await;

	assert!(
		library_options_result.is_ok(),
		"Failed to create library options: {:?}",
		library_options_result
	);

	let library_options = library_options_result.unwrap();

	let library = client
		.library()
		.create(
			"series_based_library".into(),
			library_path.to_str().unwrap().into(),
			library_options::id::equals(library_options.id),
			vec![],
		)
		.exec()
		.await;

	assert!(library.is_ok(), "Failed to create library: {:?}", library);

	let library = library.unwrap();

	let scan_result = scan_batch(
		test_ctx.get_ctx(),
		library.path,
		"series_based_library_batch_scan".into(),
	)
	.await;

	assert!(
		scan_result.is_ok(),
		"Failed to scan library: {:?}",
		scan_result
	);

	let completed_tasks = scan_result.unwrap();

	assert_eq!(completed_tasks, 3);

	let library = client
		.library()
		.find_unique(library::id::equals(library.id))
		.include(library::include!({
			// TODO: do i need an `include` or `select` here?
			series: select {
				id
				name
				media: select {
					id
					name
				}
			}
		}))
		.exec()
		.await;

	assert!(
		library.is_ok(),
		"Query to find library failed: {:?}",
		library
	);

	let library = library.unwrap();
	assert!(library.is_some(), "Library not found");

	let library = library.unwrap();

	let library_series = library.series;
	assert_eq!(library_series.len(), 3);

	let library_media = library_series
		.into_iter()
		.map(|series| series.media)
		.flatten()
		.collect::<Vec<_>>();

	assert_eq!(library_media.len(), 3);
}
