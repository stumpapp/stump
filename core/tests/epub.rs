use rocket::{http::ContentType, tokio};
use std::{path::PathBuf, str::FromStr};

use stump_core::{
	config::Ctx,
	fs::epub::{get_epub_chapter, get_epub_resource, normalize_resource_path},
	prisma::media,
	types::{models::epub::Epub, CoreResult},
};

#[tokio::test]
async fn can_make_epub_struct() -> CoreResult<()> {
	let ctx = Ctx::mock().await;

	let media = ctx
		.db
		.media()
		.find_first(vec![media::extension::equals("epub".to_string())])
		.exec()
		.await?;

	if media.is_none() {
		// No epub file found, this is not a failure. Just skip the test.
		return Ok(());
	}

	let media = media.unwrap();

	let epub = Some(Epub::try_from(media)?);

	assert!(epub.is_some());

	Ok(())
}

#[tokio::test]
async fn can_get_resource() -> CoreResult<()> {
	let ctx = Ctx::mock().await;

	let media = ctx
		.db
		.media()
		.find_first(vec![media::extension::equals("epub".to_string())])
		.exec()
		.await?;

	if media.is_none() {
		// No epub file found, this is not a failure. Just skip the test.
		return Ok(());
	}

	let media = media.unwrap();
	let media_path = media.path.clone();

	let epub = Epub::try_from(media)?;

	let first_resource = epub.resources.into_iter().next().unwrap();

	let got_resource = get_epub_resource(&media_path, &first_resource.0);

	assert!(got_resource.is_ok());

	let got_resource = got_resource.unwrap();

	assert_eq!(
		got_resource.0,
		ContentType::from_str(&first_resource.1 .1)
			.expect("Could not determine content type")
	);

	Ok(())
}

#[test]
fn canonical_correction() {
	let invalid = PathBuf::from("OEBPS/../Styles/style.css");

	let expected = PathBuf::from("OEBPS/Styles/style.css");

	let result = normalize_resource_path(invalid, "OEBPS");

	assert_eq!(result, expected);
}

#[tokio::test]
async fn can_get_chapter() -> CoreResult<()> {
	let ctx = Ctx::mock().await;

	let media = ctx
		.db
		.media()
		.find_first(vec![media::extension::equals("epub".to_string())])
		.exec()
		.await?;

	if media.is_none() {
		// No epub file found, this is not a failure. Just skip the test.
		return Ok(());
	}

	let media = media.unwrap();

	let result = get_epub_chapter(&media.path, 4)?;

	println!("{:?}", result);

	assert!(result.1.len() > 0);

	Ok(())
}
