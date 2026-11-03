use std::{
	fs,
	io::{Cursor, Write},
	path::PathBuf,
};

use axum_test::multipart::{MultipartForm, Part};
use models::shared::enums::UserPermission;
use serde_json::{json, Value};
use tempfile::TempDir;
use tests::{fake_data, fixtures};

use crate::common::{account::CreateTestUser, TestApp};

const UPLOAD_BOOKS: &str =
	r#"mutation UploadBooks($input: UploadBooksInput!) { uploadBooks(input: $input) }"#;
const UPLOAD_SERIES: &str = r#"mutation UploadSeries($input: UploadSeriesInput!) { uploadSeries(input: $input) }"#;

/// a running app with a real library directory (inside a tempdir), a directory
/// outside the library root, and a user with perms for UploadFile
struct UploadFixture {
	app: TestApp,
	library_id: String,
	library_dir: PathBuf,
	outside_dir: PathBuf,
	tempdir_root: PathBuf,
	_tempdir: TempDir,
	token: String,
}

async fn setup() -> UploadFixture {
	let app = TestApp::new_with_default_user().await;

	let tempdir = tempfile::tempdir().expect("failed to create tempdir");
	let library_dir = tempdir.path().join("library");
	let outside_dir = tempdir.path().join("outside");
	fs::create_dir_all(&library_dir).expect("failed to create library dir");
	fs::create_dir_all(&outside_dir).expect("failed to create outside dir");

	let library = fake_data::Library {
		path: Some(library_dir.to_string_lossy().to_string()),
		..Default::default()
	}
	.insert(app.conn())
	.await;

	let user = CreateTestUser {
		username: "icanuploadyay-surelyiwontdoanythingbad!>:)".to_string(),
		permissions: vec![UserPermission::UploadFile],
		..Default::default()
	}
	.insert(&app)
	.await;

	UploadFixture {
		app,
		library_id: library.id,
		library_dir,
		outside_dir,
		tempdir_root: tempdir.path().to_path_buf(),
		_tempdir: tempdir,
		token: user.token,
	}
}

fn epub_bytes() -> Vec<u8> {
	fs::read(fixtures::get_test_epub_path()).expect("failed to read test epub")
}

/// builds a zip archive containing a single, valid epub file
fn series_zip_bytes() -> Vec<u8> {
	let epub = epub_bytes();
	let mut cursor = Cursor::new(Vec::new());
	{
		let mut writer = zip::ZipWriter::new(&mut cursor);
		let options = zip::write::SimpleFileOptions::default();
		writer
			.start_file("book/book.epub", options)
			.expect("failed to add zip entry");
		writer.write_all(&epub).expect("failed to write zip entry");
		writer.finish().expect("failed to finish zip");
	}
	cursor.into_inner()
}

fn upload_books_form(library_id: &str, place_at: &str, file_name: &str) -> MultipartForm {
	let operations = json!({
		"query": UPLOAD_BOOKS,
		"variables": {
			"input": { "libraryId": library_id, "placeAt": place_at, "uploads": [null] }
		}
	});
	let map = json!({ "0": ["variables.input.uploads.0"] });

	MultipartForm::new()
		.add_part(
			"operations",
			Part::text(operations.to_string()).mime_type("application/json"),
		)
		.add_part(
			"map",
			Part::text(map.to_string()).mime_type("application/json"),
		)
		.add_part(
			"0",
			Part::bytes(epub_bytes())
				.file_name(file_name)
				.mime_type("application/epub+zip"),
		)
}

fn upload_series_form(
	library_id: &str,
	place_at: &str,
	series_dir_name: &str,
) -> MultipartForm {
	let operations = json!({
		"query": UPLOAD_SERIES,
		"variables": {
			"input": {
				"libraryId": library_id,
				"placeAt": place_at,
				"seriesDirName": series_dir_name,
				"upload": null
			}
		}
	});
	let map = json!({ "0": ["variables.input.upload"] });

	MultipartForm::new()
		.add_part(
			"operations",
			Part::text(operations.to_string()).mime_type("application/json"),
		)
		.add_part(
			"map",
			Part::text(map.to_string()).mime_type("application/json"),
		)
		.add_part(
			"0",
			Part::bytes(series_zip_bytes())
				.file_name("series.zip")
				.mime_type("application/zip"),
		)
}

async fn post_gql_multipart(app: &TestApp, token: &str, form: MultipartForm) -> Value {
	let response = app
		.server
		.post("/api/graphql")
		.add_header("Authorization", format!("Bearer {token}"))
		.multipart(form)
		.await;

	response.assert_status_ok();
	response.json()
}

fn assert_upload_errored(response: &Value) {
	assert!(
		response.get("errors").is_some(),
		"expected upload to be rejected: {response:#}"
	);
}

fn assert_upload_succeeded(response: &Value, mutation: &str) {
	assert!(
		response.get("errors").is_none(),
		"expected upload to succeed: {response:#}"
	);
	assert_eq!(
		response["data"][mutation],
		json!(true),
		"expected {mutation} to return true"
	);
}

fn assert_library_dir_empty(library_dir: &PathBuf) {
	let entries = fs::read_dir(library_dir)
		.expect("failed to read library dir")
		.count();
	assert_eq!(entries, 0, "library directory should be empty");
}

fn assert_outside_dir_empty(outside_dir: &PathBuf) {
	let entries = fs::read_dir(outside_dir)
		.expect("failed to read outside dir")
		.count();
	assert_eq!(
		entries, 0,
		"nothing should have been placed outside the library"
	);
}

/// upload_books with a traversal filename must be rejected, and no file may be
/// created outside the library
#[tokio::test]
async fn test_upload_books_rejects_traversal_filename() {
	let fixture = setup().await;

	let form = upload_books_form(
		&fixture.library_id,
		&fixture.library_dir.to_string_lossy(),
		"../defnotmalware.epub",
	);
	let response = post_gql_multipart(&fixture.app, &fixture.token, form).await;

	assert_upload_errored(&response);
	assert_library_dir_empty(&fixture.library_dir);
	assert!(
		!fixture.tempdir_root.join("defnotmalware.epub").exists(),
		"file must not escape the library via traversal filename"
	);
}

/// upload_books with an absolute filename must be rejected. The absolute target
/// is inside the writable tempdir so a regression would actually create the file
#[tokio::test]
async fn test_upload_books_rejects_absolute_filename() {
	let fixture = setup().await;
	let target = fixture.outside_dir.join("defnotmalware.epub");

	let form = upload_books_form(
		&fixture.library_id,
		&fixture.library_dir.to_string_lossy(),
		&target.to_string_lossy(),
	);
	let response = post_gql_multipart(&fixture.app, &fixture.token, form).await;

	assert_upload_errored(&response);
	assert_library_dir_empty(&fixture.library_dir);
	assert!(
		!target.exists(),
		"file must not be placed at an absolute filename outside the library"
	);
}

/// upload_books with an absolute place_at outside the library must be rejected,
/// even though the directory exists and is writable
#[tokio::test]
async fn test_upload_books_rejects_absolute_place_at_outside_library() {
	let fixture = setup().await;

	let form = upload_books_form(
		&fixture.library_id,
		&fixture.outside_dir.to_string_lossy(),
		"defnotmalware.epub",
	);
	let response = post_gql_multipart(&fixture.app, &fixture.token, form).await;

	assert_upload_errored(&response);
	assert_library_dir_empty(&fixture.library_dir);
	assert_outside_dir_empty(&fixture.outside_dir);
}

/// upload_books with traversal in place_at must be rejected
#[tokio::test]
async fn test_upload_books_rejects_traversal_place_at() {
	let fixture = setup().await;

	let place_at = fixture
		.library_dir
		.join("sub/../../nothingtoseehere")
		.to_string_lossy()
		.to_string();
	let form = upload_books_form(&fixture.library_id, &place_at, "defnotmalware.epub");
	let response = post_gql_multipart(&fixture.app, &fixture.token, form).await;

	assert_upload_errored(&response);
	assert!(
		!fixture.tempdir_root.join("nothingtoseehere").exists(),
		"traversal place_at must not resolve outside the library"
	);
}

/// an upload with a full absolute place_at inside the library should work
#[tokio::test]
async fn test_upload_books_benign_upload_stays_inside_library() {
	let fixture = setup().await;

	let form = upload_books_form(
		&fixture.library_id,
		&fixture.library_dir.to_string_lossy(),
		"book.epub",
	);
	let response = post_gql_multipart(&fixture.app, &fixture.token, form).await;

	assert_upload_succeeded(&response, "uploadBooks");
	assert!(
		fixture.library_dir.join("book.epub").exists(),
		"file should exist inside the library"
	);
}

/// upload_series with an absolute series_dir_name must be rejected
#[tokio::test]
async fn test_upload_series_rejects_absolute_series_dir_name() {
	let fixture = setup().await;

	let form = upload_series_form(
		&fixture.library_id,
		&fixture.library_dir.to_string_lossy(),
		&fixture.outside_dir.to_string_lossy(),
	);
	let response = post_gql_multipart(&fixture.app, &fixture.token, form).await;

	assert_upload_errored(&response);
	assert_library_dir_empty(&fixture.library_dir);
	assert_outside_dir_empty(&fixture.outside_dir);
}

/// upload_series with an absolute place_at outside the library must be rejected
#[tokio::test]
async fn test_upload_series_rejects_absolute_place_at_outside_library() {
	let fixture = setup().await;

	let form = upload_series_form(
		&fixture.library_id,
		&fixture.outside_dir.to_string_lossy(),
		"My Series",
	);
	let response = post_gql_multipart(&fixture.app, &fixture.token, form).await;

	assert_upload_errored(&response);
	assert_library_dir_empty(&fixture.library_dir);
	assert_outside_dir_empty(&fixture.outside_dir);
}

/// upload_series with traversal in series_dir_name must be rejected
#[tokio::test]
async fn test_upload_series_rejects_traversal_series_dir_name() {
	let fixture = setup().await;

	let form = upload_series_form(
		&fixture.library_id,
		&fixture.library_dir.to_string_lossy(),
		"../stinky-series",
	);
	let response = post_gql_multipart(&fixture.app, &fixture.token, form).await;

	assert_upload_errored(&response);
	assert!(
		!fixture.tempdir_root.join("stinky-series").exists(),
		"series must not escape the library via traversal directory name"
	);
}

/// a benign series upload must keep working and extract inside the library
///
/// Note: runs on a multi-threaded runtime because the series upload handler
/// uses `tokio::task::block_in_place` which panics on the single-threaded runtime
#[tokio::test(flavor = "multi_thread")]
async fn test_upload_series_benign_upload_stays_inside_library() {
	let fixture = setup().await;

	let form = upload_series_form(
		&fixture.library_id,
		&fixture.library_dir.to_string_lossy(),
		"My Series",
	);
	let response = post_gql_multipart(&fixture.app, &fixture.token, form).await;

	assert_upload_succeeded(&response, "uploadSeries");
	assert!(
		fixture
			.library_dir
			.join("My Series")
			.join("book")
			.join("book.epub")
			.exists(),
		"series contents should be extracted inside the library"
	);
}

/// a user without the UploadFile permission must not be able to upload at all
#[tokio::test]
async fn test_upload_books_requires_upload_file_permission() {
	let fixture = setup().await;

	let user = CreateTestUser {
		username: "no-upload-perms".to_string(),
		..Default::default()
	}
	.insert(&fixture.app)
	.await;

	let form = upload_books_form(
		&fixture.library_id,
		&fixture.library_dir.to_string_lossy(),
		"book.epub",
	);
	let response = post_gql_multipart(&fixture.app, &user.token, form).await;

	assert_upload_errored(&response);
	assert_library_dir_empty(&fixture.library_dir);
}
