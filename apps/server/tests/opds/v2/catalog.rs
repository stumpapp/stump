use crate::common::{
	account::CreateTestUser, series::setup_single_series_with_n_books, TestApp,
};

use models::entity::library_exclusion;
use sea_orm::{ActiveModelTrait, ActiveValue::Set};
use serde_json::Value;
use tests::fake_data;

fn link<'a>(body: &'a Value, rel: &str) -> Option<&'a str> {
	body["links"]
		.as_array()?
		.iter()
		.find(|link| link["rel"] == rel)
		.and_then(|link| link["href"].as_str())
}

async fn setup_library_with_series(app: &TestApp, id: &str, series_count: usize) {
	let library = fake_data::Library {
		id: Some(id.to_string()),
		name: Some(id.to_string()),
		..Default::default()
	}
	.insert(app.conn())
	.await;

	for number in 0..series_count {
		setup_single_series_with_n_books(
			app,
			fake_data::Series {
				id: Some(format!("{id}-series-{number:02}")),
				name: Some(format!("{id} series {number:02}")),
				library_id: Some(library.id.clone()),
				..Default::default()
			},
			1,
		)
		.await;
	}
}

#[tokio::test]
async fn libraries_paginate_with_valid_navigation_links() {
	let app = TestApp::new_with_default_user().await;
	for number in 0..21 {
		setup_library_with_series(&app, &format!("library-{number:02}"), 0).await;
	}

	let first = app.get("/opds/v2.0/libraries?page=1&page_size=20").await;
	first.assert_status_ok();
	let first: Value = first.json();
	assert_eq!(first["metadata"]["numberOfItems"], 21);
	assert_eq!(first["metadata"]["itemsPerPage"], 20);
	assert_eq!(first["metadata"]["currentPage"], 1);
	assert_eq!(first["navigation"].as_array().unwrap().len(), 20);
	assert!(link(&first, "self")
		.unwrap()
		.ends_with("/opds/v2.0/libraries?page=1"));
	assert!(link(&first, "next")
		.unwrap()
		.ends_with("/opds/v2.0/libraries?page=2"));
	assert!(link(&first, "previous").is_none());

	let second = app.get("/opds/v2.0/libraries?page=2&page_size=20").await;
	second.assert_status_ok();
	let second: Value = second.json();
	assert_eq!(second["navigation"].as_array().unwrap().len(), 1);
	assert!(link(&second, "previous").unwrap().ends_with("page=1"));
	assert!(link(&second, "next").is_none());
}

#[tokio::test]
async fn library_series_group_links_to_paginated_scoped_series_feed() {
	let app = TestApp::new_with_default_user().await;
	setup_library_with_series(&app, "library", 11).await;

	let catalog = app.get("/opds/v2.0/libraries/library").await;
	catalog.assert_status_ok();
	let catalog: Value = catalog.json();
	let group = catalog["groups"]
		.as_array()
		.unwrap()
		.iter()
		.find(|group| group["metadata"]["title"] == "Library Series")
		.unwrap();
	assert!(group["links"].as_array().unwrap().iter().any(|link| {
		link["rel"] == "self"
			&& link["href"]
				.as_str()
				.unwrap()
				.ends_with("/opds/v2.0/libraries/library/series")
	}));
	assert!(catalog["navigation"]
		.as_array()
		.unwrap()
		.iter()
		.any(|link| {
			link["title"] == "All Series"
				&& link["href"]
					.as_str()
					.unwrap()
					.ends_with("/opds/v2.0/libraries/library/series")
				&& link["rel"] == "subsection"
		}));

	let first = app
		.get("/opds/v2.0/libraries/library/series?page=1&page_size=10")
		.await;
	first.assert_status_ok();
	let first: Value = first.json();
	assert_eq!(first["navigation"].as_array().unwrap().len(), 10);
	assert!(link(&first, "self")
		.unwrap()
		.ends_with("page=1&page_size=10"));
	assert!(link(&first, "next")
		.unwrap()
		.ends_with("page=2&page_size=10"));

	let second = app
		.get("/opds/v2.0/libraries/library/series?page=2&page_size=10")
		.await;
	second.assert_status_ok();
	let second: Value = second.json();
	assert_eq!(second["navigation"].as_array().unwrap().len(), 1);
	assert!(link(&second, "next").is_none());
}

#[tokio::test]
async fn library_series_feed_rejects_a_library_hidden_from_the_user() {
	let app = TestApp::new_with_default_user().await;
	setup_library_with_series(&app, "hidden-library", 1).await;
	let other = CreateTestUser {
		username: "other-opds-user".to_string(),
		..Default::default()
	}
	.insert(&app)
	.await;
	library_exclusion::ActiveModel {
		user_id: Set(other.id),
		library_id: Set("hidden-library".to_string()),
		..Default::default()
	}
	.insert(app.conn())
	.await
	.expect("should hide library from other user");

	let response = app
		.server
		.get("/opds/v2.0/libraries/hidden-library/series")
		.add_header("Authorization", format!("Bearer {}", other.token))
		.await;
	assert_eq!(response.status_code(), 404);
}

#[tokio::test]
async fn terminal_book_page_has_no_next_and_uses_catalog_start_link() {
	let app = TestApp::new_with_default_user().await;
	setup_library_with_series(&app, "library", 2).await;

	let response = app
		.get("/opds/v2.0/series/library-series-00?page=1&page_size=20")
		.await;
	response.assert_status_ok();
	let body: Value = response.json();
	assert!(link(&body, "next").is_none());
	assert!(link(&body, "start")
		.unwrap()
		.ends_with("/opds/v2.0/catalog"));
	assert!(link(&body, "self")
		.unwrap()
		.ends_with("/opds/v2.0/series/library-series-00?page=1"));
}
