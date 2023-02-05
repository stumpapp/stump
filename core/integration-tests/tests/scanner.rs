use crate::utils::{init_test, run_test_scan, TempLibrary};

use stump_core::{
	db::models::{LibraryPattern, LibraryScanMode},
	prelude::{CoreResult, Ctx},
	prisma::{library, PrismaClient},
};

async fn check_library_post_scan(
	client: &PrismaClient,
	id: &str,
	series_count: usize,
	media_count: usize,
) -> CoreResult<()> {
	let library = client
		.library()
		.find_unique(library::id::equals(id.to_string()))
		.include(library::include!({
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
		.await?
		.expect("Error during test, library not found");

	let library_series = library.series;
	assert_eq!(library_series.len(), series_count);

	let library_media_count = library_series
		.into_iter()
		.flat_map(|series| series.media)
		.count();
	assert_eq!(library_media_count, media_count);

	Ok(())
}

#[tokio::test]
async fn series_based_library_batch_scan() -> CoreResult<()> {
	init_test().await;

	let ctx = Ctx::mock().await;
	let client = ctx.get_db();

	let (library, _library_options, _tmp) =
		TempLibrary::create(client, LibraryPattern::SeriesBased, LibraryScanMode::None)
			.await?;

	let scan_result = run_test_scan(&ctx, &library, LibraryScanMode::Sync).await;

	assert!(
		scan_result.is_ok(),
		"Failed to scan library: {:?}",
		scan_result
	);

	let completed_tasks = scan_result.unwrap();
	assert_eq!(completed_tasks, 3);

	check_library_post_scan(client, &library.id, 3, 3).await?;

	Ok(())
}

#[tokio::test(flavor = "multi_thread")]
async fn collection_based_library_batch_scan() -> CoreResult<()> {
	init_test().await;

	let ctx = Ctx::mock().await;
	let client = ctx.get_db();

	let (library, _library_options, _tmp) = TempLibrary::create(
		client,
		LibraryPattern::CollectionBased,
		LibraryScanMode::None,
	)
	.await?;

	let scan_result = run_test_scan(&ctx, &library, LibraryScanMode::Batched).await;

	assert!(
		scan_result.is_ok(),
		"Failed to scan library: {:?}",
		scan_result
	);

	let completed_tasks = scan_result.unwrap();
	assert_eq!(completed_tasks, 3);

	check_library_post_scan(client, &library.id, 1, 3).await?;

	Ok(())
}

// Note: This test is ignored because it kind of needs to be run with multiple threads,
// but the test runner for stump will only run one test at a time. It would just take too long
// otherwise.
#[tokio::test(flavor = "multi_thread")]
#[ignore]
async fn massive_library_batch_scan() -> CoreResult<()> {
	init_test().await;

	let ctx = Ctx::mock().await;
	let client = ctx.get_db();

	let temp_library = TempLibrary::massive_library(10000, LibraryPattern::SeriesBased)?;
	let (library, _options) = temp_library.insert(client, LibraryScanMode::None).await?;
	let scan_result = run_test_scan(&ctx, &library, LibraryScanMode::Batched).await;

	assert!(
		scan_result.is_ok(),
		"Failed to scan library: {:?}",
		scan_result
	);

	let completed_tasks = scan_result.unwrap();
	assert_eq!(completed_tasks, 10000);

	check_library_post_scan(client, &library.id, 10000, 10000).await?;

	Ok(())
}
