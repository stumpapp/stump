use serde_json::Value;

use super::streaming::setup_epub_book;

#[tokio::test]
async fn test_epub_resolve_cfi_requires_auth() {
	let (app, book_id) = setup_epub_book().await;

	let response = app
		.server
		.get(
			format!("/api/v2/epub/{book_id}/resolve-cfi?cfi=epubcfi(/6/2!/4/2/1:0)")
				.as_str(),
		)
		.await;

	assert!(
		response.status_code().is_client_error(),
		"expected client error without auth, got {}",
		response.status_code()
	);
}

#[tokio::test]
async fn test_epub_resolve_cfi_invalid() {
	let (app, book_id) = setup_epub_book().await;

	let response = app
		.get(format!("/api/v2/epub/{book_id}/resolve-cfi?cfi=not-a-cfi").as_str())
		.await;
	response.assert_status_bad_request();
}

#[tokio::test]
async fn test_epub_resolve_cfi_known_spine() {
	let (app, book_id) = setup_epub_book().await;

	let response = app
		.get(
			format!("/api/v2/epub/{book_id}/resolve-cfi?cfi=epubcfi(/6/2!/4/2/1:0)")
				.as_str(),
		)
		.await;
	response.assert_status_ok();

	let body: Value = response.json();
	let href = body.get("href").and_then(Value::as_str).unwrap_or_default();
	assert!(href.contains(&format!("/api/v2/epub/{book_id}/resource/")));
	assert_eq!(
		body.pointer("/locations/partialCfi")
			.and_then(Value::as_str),
		Some("/4/2/1:0")
	);
}
