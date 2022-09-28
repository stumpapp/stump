use rocket::tokio;
use std::path::Path;

use crate::utils::init_test;

use stump_core::{
	config::Ctx,
	fs::{
		checksum,
		rar::{convert_rar_to_zip, rar_sample},
	},
	prisma::media,
	types::CoreResult,
};

// TODO: fix these tests...

#[test]
// TODO: don't ignore, need to figure out best way to do this... something like the
// tempfile crate maybe?
#[ignore]
fn test_rar_to_zip() {
	let test_file = "/Users/aaronleopold/Documents/Stump/Demo/Venom/Venom 001 (2022).cbr";

	let path = Path::new(test_file);

	let result = convert_rar_to_zip(path);

	// assert!(result.is_ok());

	let zip_path = result.unwrap();

	// assert!(zip_path.exists());

	println!("{:?}", zip_path);
}

#[tokio::test]
async fn digest_rars_asynchronous() -> CoreResult<()> {
	init_test().await;

	let ctx = Ctx::mock().await;

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
	if rars.len() == 0 {
		println!("STINKY: could not run digest_rars_asynchronous test until aaron fixes his stuff");
		return Ok(());
	}

	for rar in rars {
		let rar_sample_result = rar_sample(&rar.path);

		assert!(rar_sample_result.is_ok());

		let rar_sample = rar_sample_result.unwrap();

		let digest_result = checksum::digest_async(&rar.path, rar_sample).await;
		assert!(digest_result.is_ok());

		let checksum = digest_result.unwrap();
		assert_ne!(checksum.len(), 0);
	}

	Ok(())
}

#[tokio::test]
async fn digest_rars_synchronous() -> CoreResult<()> {
	init_test().await;

	let ctx = Ctx::mock().await;

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
	if rars.len() == 0 {
		println!("STINKY: could not run digest_rars_synchronous test until aaron fixes his stuff");
		return Ok(());
	}

	for rar in rars {
		let rar_sample_result = rar_sample(&rar.path);
		assert!(rar_sample_result.is_ok());

		let rar_sample = rar_sample_result.unwrap();

		let digest_result = checksum::digest(&rar.path, rar_sample);
		assert!(digest_result.is_ok());

		let checksum = digest_result.unwrap();
		assert_ne!(checksum.len(), 0);
	}

	Ok(())
}
