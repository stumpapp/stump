use stump_core::{
	config::Ctx,
	fs::{checksum, zip::zip_sample},
	prisma::media,
	types::CoreResult,
};

use rocket::tokio;

// TODO: fix these tests...

#[tokio::test]
async fn digest_zips_asynchronous() -> CoreResult<()> {
	let ctx = Ctx::mock().await;

	let zips = ctx
		.db
		.media()
		.find_many(vec![media::extension::in_vec(vec![
			"zip".to_string(),
			"cbz".to_string(),
		])])
		.exec()
		.await?;

	if zips.len() == 0 {
		println!("Warning: could not run digest_zips_asynchronous test, please insert RAR files in the mock database...");
		return Ok(());
	}

	for zip in zips {
		let zip_sample = zip_sample(&zip.path);

		let checksum = match checksum::digest_async(&zip.path, zip_sample).await {
			Ok(digest) => {
				println!("Generated checksum (async): {:?}", digest);

				Some(digest)
			},
			Err(e) => {
				println!("Failed to digest zip: {}", e);
				None
			},
		};

		assert!(checksum.is_some());
	}

	Ok(())
}

#[tokio::test]
async fn digest_zips_synchronous() -> CoreResult<()> {
	let ctx = Ctx::mock().await;

	let zips = ctx
		.db
		.media()
		.find_many(vec![media::extension::in_vec(vec![
			"zip".to_string(),
			"cbz".to_string(),
		])])
		.exec()
		.await?;

	if zips.len() == 0 {
		println!("Warning: could not run digest_zips_synchronous test, please insert RAR files in the mock database...");
		return Ok(());
	}

	for zip in zips {
		let zip_sample = zip_sample(&zip.path);

		let checksum = match checksum::digest(&zip.path, zip_sample) {
			Ok(digest) => {
				println!("Generated checksum: {:?}", digest);
				Some(digest)
			},
			Err(e) => {
				println!("Failed to digest zip: {}", e);
				None
			},
		};

		assert!(checksum.is_some());
	}

	Ok(())
}
