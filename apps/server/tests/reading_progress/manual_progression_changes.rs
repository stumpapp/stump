use crate::common::TestApp;

use models::entity::{media, reading_session_v2};
use sea_orm::{prelude::*, QueryOrder};
use tests::fake_data;

async fn setup() -> TestApp {
	let app = TestApp::new_with_default_user().await;
	let db = app.conn();

	let black_science = fake_data::Series {
		name: Some("Black Science".to_string()),
		..Default::default()
	}
	.insert(db)
	.await;

	for i in 1..=5 {
		fake_data::Media {
			series_id: black_science.id.clone(),
			id: Some(format!("black_science_{}", i)),
			name: Some(format!("Black Science #{}", i)),
			created_at: Some("1605-01-16T00:00:00Z".parse().unwrap()),
			pages: Some(100),
			..Default::default()
		}
		.insert(db)
		.await;
	}

	app
}

// TODO(v2-sessions): add these once i refactor them in server

// #[tokio::test]
// async fn test_mark_unread_series_as_complete() {}

// #[tokio::test]
// async fn test_mark_incomplete_series_as_complete() {}

// #[tokio::test]
// async fn test_mark_complete_series_as_incomplete() {}

// #[tokio::test]
// async fn test_mark_unread_book_as_complete() {}

// #[tokio::test]
// async fn test_mark_incomplete_book_as_complete() {}
