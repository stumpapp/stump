use serde_json::Value;

use crate::common::TestApp;

use super::streaming::setup_epub_book;

/// unauthenticated requests to search should fail
#[tokio::test]
async fn test_epub_search_requires_auth() {
	let (app, book_id) = setup_epub_book().await;

	let response = app
		.server
		.get(format!("/api/v2/epub/{book_id}/search?q=Alice").as_str())
		.await;

	assert!(
		response.status_code().is_client_error(),
		"expected client error without auth, got {}",
		response.status_code()
	);
}

#[tokio::test]
async fn test_epub_search_not_found() {
	let app = TestApp::new_with_default_user().await;
	let response = app.get("/api/v2/epub/does-not-exist/search?q=Alice").await;
	response.assert_status_not_found();
}

#[tokio::test]
async fn test_epub_search_query_validation() {
	let (app, book_id) = setup_epub_book().await;

	let too_short = app
		.get(format!("/api/v2/epub/{book_id}/search?q=a").as_str())
		.await;
	too_short.assert_status_bad_request();

	let missing = app
		.get(format!("/api/v2/epub/{book_id}/search").as_str())
		.await;
	assert!(
		missing.status_code().is_client_error(),
		"missing q should fail"
	);
}

#[tokio::test]
async fn test_epub_search_known_hit() {
	let (app, book_id) = setup_epub_book().await;

	let response = app
		.get(format!("/api/v2/epub/{book_id}/search?q=Alice&limit=5").as_str())
		.await;
	response.assert_status_ok();

	let body: Value = response.json();
	assert_eq!(body.get("query").and_then(Value::as_str), Some("Alice"));
	let results = body
		.get("results")
		.and_then(Value::as_array)
		.expect("results");
	assert!(!results.is_empty());

	let hit = &results[0];
	let excerpt = hit
		.get("excerpt")
		.and_then(Value::as_str)
		.unwrap_or_default();
	assert!(!excerpt.contains('<'));
	assert!(excerpt.to_lowercase().contains("alice"));

	let locator = hit.get("locator").expect("locator");
	let href = locator
		.get("href")
		.and_then(Value::as_str)
		.unwrap_or_default();
	assert!(
		href.contains(&format!("/api/v2/epub/{book_id}/resource/")),
		"href={href}"
	);
	assert!(locator.get("locations").is_some());
	assert!(locator.get("text").is_some());
}

#[tokio::test]
async fn test_epub_search_cursor_pagination() {
	let (app, book_id) = setup_epub_book().await;

	let first = app
		.get(format!("/api/v2/epub/{book_id}/search?q=Alice&limit=1").as_str())
		.await;
	first.assert_status_ok();
	let first_body: Value = first.json();
	let first_results = first_body
		.get("results")
		.and_then(Value::as_array)
		.expect("results");
	assert_eq!(first_results.len(), 1);
	let cursor = first_body
		.get("nextCursor")
		.and_then(Value::as_str)
		.expect("nextCursor");

	let second = app
		.get(
			format!("/api/v2/epub/{book_id}/search?q=Alice&limit=1&cursor={cursor}")
				.as_str(),
		)
		.await;
	second.assert_status_ok();
	let second_body: Value = second.json();
	let second_results = second_body
		.get("results")
		.and_then(Value::as_array)
		.expect("results");
	assert_eq!(second_results.len(), 1);

	let first_excerpt = first_results[0]
		.get("excerpt")
		.and_then(Value::as_str)
		.unwrap_or_default();
	let second_excerpt = second_results[0]
		.get("excerpt")
		.and_then(Value::as_str)
		.unwrap_or_default();
	let first_prog = first_results[0]
		.pointer("/locator/locations/progression")
		.and_then(Value::as_f64);
	let second_prog = second_results[0]
		.pointer("/locator/locations/progression")
		.and_then(Value::as_f64);
	assert!(
		first_excerpt != second_excerpt || first_prog != second_prog,
		"paginated pages should not return the same hit"
	);
}
