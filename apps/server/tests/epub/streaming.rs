use std::path::PathBuf;

use models::entity::{media, server_config};
use sea_orm::{ActiveModelTrait, ActiveValue, EntityTrait, IntoActiveModel};
use serde_json::Value;
use tests::fake_data;

use crate::common::{series::setup_single_series_with_n_books, TestApp};

fn test_epub_path() -> String {
	PathBuf::from(env!("CARGO_MANIFEST_DIR"))
		.join("../../core/integration-tests/data/book.epub")
		.canonicalize()
		.expect("book.epub fixture")
		.to_string_lossy()
		.to_string()
}

pub(crate) async fn setup_epub_book() -> (TestApp, String) {
	let app = TestApp::new_with_default_user().await;
	let db = app.conn();

	let library = fake_data::Library {
		id: Some("epub_lib".to_string()),
		name: Some("Epub Library".to_string()),
		..Default::default()
	}
	.insert(db)
	.await;

	let (_, books) = setup_single_series_with_n_books(
		&app,
		fake_data::Series {
			id: Some("epub_series".to_string()),
			name: Some("Epub Series".to_string()),
			library_id: Some(library.id.clone()),
			..Default::default()
		},
		1,
	)
	.await;

	let book = books.into_iter().next().expect("expected one book");
	let mut active: media::ActiveModel = book.clone().into_active_model();
	active.path = ActiveValue::Set(test_epub_path());
	let book = active.update(db).await.expect("update media path");

	(app, book.id)
}

fn resource_path_from_href(href: &str) -> &str {
	href.split_once("/api/v2/")
		.map(|(_, rest)| rest)
		.unwrap_or(href)
}

/// unauthenticated requests to the RWPM endpoints should fail
#[tokio::test]
async fn test_epub_manifest_requires_auth() {
	let (app, book_id) = setup_epub_book().await;

	let response = app
		.server
		.get(format!("/api/v2/epub/{book_id}/manifest.json").as_str())
		.await;

	assert!(
		response.status_code().is_client_error(),
		"expected client error without auth, got {}",
		response.status_code()
	);
}

/// unknown media ids should 404
#[tokio::test]
async fn test_epub_manifest_not_found() {
	let app = TestApp::new_with_default_user().await;

	let response = app.get("/api/v2/epub/does-not-exist/manifest.json").await;

	response.assert_status_not_found();
}

/// manifest should return RWPM with absolute resource hrefs
#[tokio::test]
async fn test_epub_manifest_ok() {
	let (app, book_id) = setup_epub_book().await;

	let response = app
		.get(format!("/api/v2/epub/{book_id}/manifest.json").as_str())
		.await;
	response.assert_status_ok();

	let content_type = response
		.headers()
		.get("content-type")
		.and_then(|v| v.to_str().ok())
		.unwrap_or_default();
	assert!(
		content_type.contains("application/webpub+json"),
		"unexpected content-type: {content_type}"
	);

	let manifest: Value = response.json();
	assert_eq!(
		manifest.get("@context").and_then(Value::as_str),
		Some("https://readium.org/webpub-manifest/context.jsonld")
	);

	let reading_order = manifest
		.get("readingOrder")
		.and_then(Value::as_array)
		.expect("readingOrder");
	assert!(!reading_order.is_empty());

	let href = reading_order[0]
		.get("href")
		.and_then(Value::as_str)
		.expect("href");
	assert!(
		href.contains(&format!("/api/v2/epub/{book_id}/resource/")),
		"href={href}"
	);

	let links = manifest
		.get("links")
		.and_then(Value::as_array)
		.expect("links");
	assert!(
		links.iter().any(|link| {
			link.get("type").and_then(Value::as_str)
				== Some("application/vnd.readium.position-list+json")
				&& link
					.get("href")
					.and_then(Value::as_str)
					.is_some_and(|h| h.ends_with("/positions.json"))
		}),
		"expected positions list link in manifest: {links:?}"
	);
}

/// positions list should be consistent
#[tokio::test]
async fn test_epub_positions_ok() {
	let (app, book_id) = setup_epub_book().await;

	let response = app
		.get(format!("/api/v2/epub/{book_id}/positions.json").as_str())
		.await;
	response.assert_status_ok();

	let content_type = response
		.headers()
		.get("content-type")
		.and_then(|v| v.to_str().ok())
		.unwrap_or_default();
	assert!(
		content_type.contains("application/vnd.readium.position-list+json"),
		"unexpected content-type: {content_type}"
	);

	let positions: Value = response.json();
	let total = positions
		.get("total")
		.and_then(Value::as_u64)
		.expect("total");
	let list = positions
		.get("positions")
		.and_then(Value::as_array)
		.expect("positions");
	assert_eq!(total as usize, list.len());
	assert!(total >= 1);
}

/// first readingOrder resource and a dependency resource should stream successfully
#[tokio::test]
async fn test_epub_resource_round_trip() {
	let (app, book_id) = setup_epub_book().await;

	let manifest_response = app
		.get(format!("/api/v2/epub/{book_id}/manifest.json").as_str())
		.await;
	manifest_response.assert_status_ok();
	let manifest: Value = manifest_response.json();

	let reading_order = manifest
		.get("readingOrder")
		.and_then(Value::as_array)
		.expect("readingOrder");
	let chapter_href = reading_order[0]
		.get("href")
		.and_then(Value::as_str)
		.expect("chapter href");
	let chapter_path = resource_path_from_href(chapter_href);

	let chapter_response = app.get(&format!("/api/v2/{chapter_path}")).await;
	chapter_response.assert_status_ok();
	let chapter_ct = chapter_response
		.headers()
		.get("content-type")
		.and_then(|v| v.to_str().ok())
		.unwrap_or_default();
	assert!(
		chapter_ct.contains("xhtml")
			|| chapter_ct.contains("html")
			|| chapter_ct.contains("xml"),
		"unexpected chapter content-type: {chapter_ct}"
	);
	assert!(!chapter_response.as_bytes().is_empty());

	let resources = manifest
		.get("resources")
		.and_then(Value::as_array)
		.expect("resources");
	let asset = resources
		.iter()
		.find(|item| {
			item.get("type")
				.and_then(Value::as_str)
				.is_some_and(|mime| mime.contains("css") || mime.starts_with("image/"))
		})
		.expect("expected css or image resource in fixture");
	let asset_href = asset
		.get("href")
		.and_then(Value::as_str)
		.expect("asset href");
	let asset_path = resource_path_from_href(asset_href);

	let asset_response = app.get(&format!("/api/v2/{asset_path}")).await;
	asset_response.assert_status_ok();
	assert!(!asset_response.as_bytes().is_empty());
}

/// nested package paths like OEBPS/... should resolve through the resource route
#[tokio::test]
async fn test_epub_nested_resource_path() {
	let (app, book_id) = setup_epub_book().await;

	let response = app
		.get(format!("/api/v2/epub/{book_id}/resource/OEBPS/pgepub.css").as_str())
		.await;
	response.assert_status_ok();
	assert!(!response.as_bytes().is_empty());
}

/// public_url on server config should win over HostExtractor for absolute hrefs
#[tokio::test]
async fn test_epub_manifest_uses_public_url() {
	let (app, book_id) = setup_epub_book().await;
	let db = app.conn();

	let config = server_config::Entity::find()
		.one(db)
		.await
		.expect("query server_config")
		.expect("server_config row");

	// Only patch public_url — avoid rewriting JWT secrets on the config row.
	server_config::ActiveModel {
		id: ActiveValue::Unchanged(config.id),
		public_url: ActiveValue::Set(Some("https://books.example".to_string())),
		..Default::default()
	}
	.update(db)
	.await
	.expect("set public_url");

	let response = app
		.get(format!("/api/v2/epub/{book_id}/manifest.json").as_str())
		.await;
	response.assert_status_ok();
	let manifest: Value = response.json();

	let href = manifest
		.get("readingOrder")
		.and_then(Value::as_array)
		.and_then(|arr| arr.first())
		.and_then(|item| item.get("href"))
		.and_then(Value::as_str)
		.expect("href");

	assert!(
		href.starts_with("https://books.example/api/v2/epub/"),
		"href should use public_url, got {href}"
	);
}
