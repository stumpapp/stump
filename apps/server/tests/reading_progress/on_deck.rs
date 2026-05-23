use crate::common::{
	book::{latest_finished_session_for_book, update_progress},
	series::setup_single_series_with_n_books,
	TestApp,
};

use chrono::{Duration, Utc};
use graphql::input::media::{MediaProgressInput, PagedProgressInput};
use models::entity::reading_session;
use sea_orm::prelude::*;
use tests::fake_data;

async fn setup() -> TestApp {
	let app = TestApp::new_with_default_user().await;
	let db = app.conn();

	let image = fake_data::Library {
		id: Some("image".to_string()),
		name: Some("Image".to_string()),
		..Default::default()
	}
	.insert(db)
	.await;

	let _ = setup_single_series_with_n_books(
		&app,
		fake_data::Series {
			id: Some("black_science".to_string()),
			name: Some("Black Science".to_string()),
			library_id: Some(image.id.clone()),
			..Default::default()
		},
		5,
	)
	.await;

	let _ = setup_single_series_with_n_books(
		&app,
		fake_data::Series {
			id: Some("invincible".to_string()),
			name: Some("Invincible".to_string()),
			library_id: Some(image.id.clone()),
			..Default::default()
		},
		5,
	)
	.await;

	app
}

async fn fetch_on_deck_ids(app: &TestApp) -> Vec<String> {
	let result = app
		.execute_gql(
			r#"
		query OnDeck {
			onDeck {
				nodes {
					id
				}
			}
		}
		"#,
			None,
		)
		.await;

	result
		.get("data")
		.and_then(|data| data.get("onDeck"))
		.and_then(|on_deck| on_deck.get("nodes"))
		.and_then(|nodes| nodes.as_array())
		.unwrap_or_else(|| panic!("expected structure missing: {result:#}"))
		.iter()
		.map(|node| {
			node.get("id")
				.and_then(|value| value.as_str())
				.expect("expected node id")
				.to_string()
		})
		.collect()
}

async fn start_active_session(app: &TestApp, book_id: &str, page: i32) {
	update_progress(
		app,
		book_id,
		MediaProgressInput::Paged(PagedProgressInput {
			page,
			elapsed_seconds_delta: Some(300),
			..Default::default()
		}),
	)
	.await;
}

async fn finish_book(app: &TestApp, book_id: &str) {
	update_progress(
		app,
		book_id,
		MediaProgressInput::Paged(PagedProgressInput {
			page: 100,
			elapsed_seconds_delta: Some(300),
			..Default::default()
		}),
	)
	.await;
}

async fn set_finished_timestamp(
	app: &TestApp,
	book_id: &str,
	updated_at: chrono::DateTime<Utc>,
) {
	let session = latest_finished_session_for_book(app, book_id).await;

	reading_session::Entity::update_many()
		.filter(reading_session::Column::Id.eq(session.id))
		.col_expr(reading_session::Column::UpdatedAt, Expr::value(updated_at))
		.exec(app.conn())
		.await
		.expect("could not update session timestamp");
}

/// no books on deck if no sessions at all
#[tokio::test]
async fn test_nothing_on_deck() {
	let app = setup().await;

	let ids = fetch_on_deck_ids(&app).await;
	assert!(ids.is_empty());
}

/// given two series with one book finished, should return in proper order what is next
#[tokio::test]
async fn test_one_books_on_deck() {
	let app = setup().await;

	finish_book(&app, "black_science_1").await;
	finish_book(&app, "invincible_1").await;

	let newer = Utc::now();
	let older = newer - Duration::minutes(20);

	set_finished_timestamp(&app, "invincible_1", newer).await;
	set_finished_timestamp(&app, "black_science_1", older).await;

	let ids = fetch_on_deck_ids(&app).await;

	assert_eq!(
		ids,
		vec!["invincible_2".to_string(), "black_science_2".to_string()]
	);
}

/// if a series has a book that is currently active, then the next book should not be in the response
#[tokio::test]
async fn test_ignore_series_with_active_book() {
	let app = setup().await;

	finish_book(&app, "invincible_1").await;
	finish_book(&app, "black_science_1").await;

	start_active_session(&app, "black_science_2", 10).await;

	let ids = fetch_on_deck_ids(&app).await;

	assert_eq!(ids, vec!["invincible_2".to_string()]);
	assert!(!ids.contains(&"black_science_2".to_string()));
	assert!(!ids.contains(&"black_science_3".to_string()));
}
