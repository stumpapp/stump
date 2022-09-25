use std::path::Path;

use stump_core::{
	config::Ctx,
	fs::{
		checksum,
		rar::{convert_rar_to_zip, rar_sample},
	},
	prisma::media,
	types::CoreResult,
};

use rocket::tokio;

// TODO: fix these tests...

#[test]
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

	if rars.len() == 0 {
		println!("Warning: could not run digest_rars_asynchronous test, please insert RAR files in the mock database...");
		return Ok(());
	}

	for rar in rars {
		let rar_sample = rar_sample(&rar.path).unwrap();

		let checksum = match checksum::digest_async(&rar.path, rar_sample).await {
			Ok(digest) => {
				println!("Generated checksum (async): {:?}", digest);

				Some(digest)
			},
			Err(e) => {
				println!("Failed to digest rar: {}", e);
				None
			},
		};

		assert!(checksum.is_some());
	}

	Ok(())
}

#[tokio::test]
async fn digest_rars_synchronous() -> CoreResult<()> {
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

	if rars.len() == 0 {
		println!("Warning: could not run digest_rars_synchronous test, please insert RAR files in the mock database...");
		return Ok(());
	}

	for rar in rars {
		let rar_sample = rar_sample(&rar.path).unwrap();

		let checksum = match checksum::digest(&rar.path, rar_sample) {
			Ok(digest) => {
				println!("Generated checksum: {:?}", digest);
				Some(digest)
			},
			Err(e) => {
				println!("Failed to digest rar: {}", e);
				None
			},
		};

		assert!(checksum.is_some());
	}

	Ok(())
}
