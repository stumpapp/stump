use crate::utils::{init_test, make_tmp_file, TempLibrary};

use stump_core::{
	db::models::{LibraryPattern, LibraryScanMode},
	fs::{
		checksum,
		media_file::rar::{convert_to_zip, sample_size},
	},
	prelude::{CoreResult, Ctx},
	prisma::media,
};

// TODO: fix these tests...

#[test]
// TODO: don't ignore, need to figure out best way to do this... something like the
// tempfile crate maybe?
#[ignore]
fn test_rar_to_zip() -> CoreResult<()> {
	let tmp_file = make_tmp_file("book.rar")?;

	let path = tmp_file.path();

	let result = convert_to_zip(path);
	assert!(result.is_ok());

	let zip_path = result.unwrap();
	assert!(zip_path.exists());

	// TODO: more?

	Ok(())
}

#[tokio::test]
#[ignore]
async fn digest_rars_synchronous() -> CoreResult<()> {
	init_test().await;

	let ctx = Ctx::integration_test_mock().await;

	let _ret = TempLibrary::create(
		ctx.get_db(),
		LibraryPattern::SeriesBased,
		LibraryScanMode::Batched,
	)
	.await?;

	let rars = ctx
		.db
		.media()
		.find_many(vec![media::extension::in_vec(vec![
			"rar".to_string(),
			"cbr".to_string(),
		])])
		.exec()
		.await?;

	// TODO: uncomment once I create rar test data
	// assert_ne!(rars.len(), 0);

	// TODO: remove this check once I create rar test data
	if rars.is_empty() {
		println!("STINKY: could not run digest_rars_synchronous test until aaron fixes his stuff");
		return Ok(());
	}

	for rar in rars {
		let rar_sample_result = sample_size(&rar.path);
		assert!(rar_sample_result.is_ok());

		let rar_sample = rar_sample_result.unwrap();

		let digest_result = checksum::digest(&rar.path, rar_sample);
		assert!(digest_result.is_ok());

		let checksum = digest_result.unwrap();
		assert_ne!(checksum.len(), 0);
	}

	Ok(())
}
