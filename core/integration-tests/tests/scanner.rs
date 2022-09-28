use rocket::tokio;

use crate::utils::{create_library, init_test, run_test_scan, TempLibrary};

use stump_core::{
	config::Ctx,
	prisma::{library, PrismaClient},
	types::{CoreResult, LibraryPattern, LibraryScanMode},
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

	let library_media = library_series
		.into_iter()
		.map(|series| series.media)
		.flatten()
		.collect::<Vec<_>>();
	assert_eq!(library_media.len(), media_count);

	Ok(())
}

#[tokio::test]
async fn series_based_library_batch_scan() -> CoreResult<()> {
	init_test().await;

	let ctx = Ctx::mock().await;
	let tmp_library = TempLibrary::series_library()?;
	let library_root = tmp_library.fmt_with_root("series-based-library");
	let library_root_str = library_root.to_str().unwrap();

	let client = ctx.get_db();

	let (library, _library_options) = create_library(
		client,
		"series_based_library",
		library_root_str,
		LibraryPattern::SeriesBased,
		LibraryScanMode::None,
	)
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

#[tokio::test]
async fn collection_based_library_batch_scan() -> CoreResult<()> {
	init_test().await;

	let ctx = Ctx::mock().await;
	let client = ctx.get_db();

	let tmp_library = TempLibrary::series_library()?;
	let library_root = tmp_library.fmt_with_root("collection-based-library");
	let library_root_str = library_root.to_str().unwrap();

	let (library, _library_options) = create_library(
		client,
		"collection_based_library",
		library_root_str,
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
	assert_eq!(completed_tasks, 6);

	check_library_post_scan(client, &library.id, 1, 3).await?;

	Ok(())
}
