use crate::common::{
	book::{create_nth_readthrough, update_progress},
	TestApp,
};

use graphql::input::media::{MediaProgressInput, PagedProgressInput};
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

	let black_science = fake_data::Series {
		id: Some("black_science".to_string()),
		name: Some("Black Science".to_string()),
		library_id: Some(image.id.clone()),
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

	let invincible = fake_data::Series {
		id: Some("invincible".to_string()),
		name: Some("Invincible".to_string()),
		library_id: Some(image.id.clone()),
		..Default::default()
	}
	.insert(db)
	.await;

	for i in 1..=5 {
		fake_data::Media {
			series_id: invincible.id.clone(),
			id: Some(format!("invincible_{}", i)),
			name: Some(format!("Invincible #{}", i)),
			created_at: Some("1605-01-16T00:00:00Z".parse().unwrap()),
			pages: Some(100),
			..Default::default()
		}
		.insert(db)
		.await;
	}

	app
}

async fn fetch_series_stats(app: &TestApp, series_id: &str) -> serde_json::Value {
	let result = app
		.execute_gql(
			r#"
        query SeriesStats($id: ID!) {
            seriesById(id: $id) {
                stats {
                    bookCount
                    completedBooks
                    inProgressBooks
                    totalReadingTimeSeconds
                }
            }
        }
        "#,
			Some(serde_json::json!({
				"id": series_id,
			})),
		)
		.await;

	result
		.get("data")
		.and_then(|data| data.get("seriesById"))
		.and_then(|series| series.get("stats"))
		.cloned()
		.expect("expected series stats in GraphQL response")
}

#[tokio::test]
async fn test_series_stats() {
	let app = setup().await;

	update_progress(
		&app,
		"black_science_1",
		MediaProgressInput::Paged(PagedProgressInput {
			page: 10,
			elapsed_seconds_delta: Some(300),
			..Default::default()
		}),
	)
	.await;

	update_progress(
		&app,
		"black_science_1",
		MediaProgressInput::Paged(PagedProgressInput {
			page: 11,
			elapsed_seconds_delta: Some(300),
			..Default::default()
		}),
	)
	.await; // book 1 should be at 600 secs now

	create_nth_readthrough(&app, "black_science_2", 1).await; // 600 secs

	let stats = fetch_series_stats(&app, "black_science").await;

	assert_eq!(stats["bookCount"], 5);
	assert_eq!(stats["completedBooks"], 1);
	assert_eq!(stats["inProgressBooks"], 1);
	assert_eq!(stats["totalReadingTimeSeconds"], 1200);
}
