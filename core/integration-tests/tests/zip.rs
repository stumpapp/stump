use stump_core::{
	config::Ctx,
	fs::{checksum, zip::zip_sample},
	prisma::media,
	types::CoreResult,
};

use rocket::tokio;

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

	assert_ne!(zips.len(), 0);

	for zip in zips {
		let zip_sample = zip_sample(&zip.path);

		let digest_result = checksum::digest_async(&zip.path, zip_sample).await;
		assert!(digest_result.is_ok());

		let checksum = digest_result.unwrap();
		assert_ne!(checksum.len(), 0);
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

	assert_ne!(zips.len(), 0);

	for zip in zips {
		let zip_sample = zip_sample(&zip.path);

		let digest_result = checksum::digest(&zip.path, zip_sample);
		assert!(digest_result.is_ok());

		let checksum = digest_result.unwrap();
		assert_ne!(checksum.len(), 0);
	}

	Ok(())
}
