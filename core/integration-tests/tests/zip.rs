use stump_core::{
	db::models::{LibraryPattern, LibraryScanMode},
	fs::{checksum, media_file::zip},
	prelude::{CoreResult, Ctx},
	prisma::media,
};

use crate::utils::{init_test, TempLibrary};

#[tokio::test]
async fn digest_zips() -> CoreResult<()> {
	init_test().await;

	let ctx = Ctx::integration_test_mock().await;

	let _ret = TempLibrary::create(
		ctx.get_db(),
		LibraryPattern::SeriesBased,
		LibraryScanMode::Batched,
	)
	.await?;

	let zips = ctx
		.db
		.media()
		.find_many(vec![media::extension::in_vec(vec![
			"zip".to_string(),
			"cbz".to_string(),
		])])
		.exec()
		.await?;

	assert_ne!(zips.len(), 0);

	for zip in zips {
		let zip_sample = zip::sample_size(&zip.path);

		let digest_result = checksum::digest(&zip.path, zip_sample);
		assert!(digest_result.is_ok());

		let checksum = digest_result.unwrap();
		assert_ne!(checksum.len(), 0);
	}

	Ok(())
}
