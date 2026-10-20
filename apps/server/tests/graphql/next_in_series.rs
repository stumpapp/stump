use crate::common::{
	fixtures::murderbot::{self, create_murderbot},
	series::setup_single_series_with_n_books,
	TestApp,
};
use models::entity::{media, media_metadata, series};
use sea_orm::{
	ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait, IntoActiveModel,
	QueryFilter,
};
use tests::fake_data;

// TODO: move into media/ ???? ugh

async fn fudge_murderbot_position(app: &TestApp, name: &str) {
	let metadata = media_metadata::Entity::find()
		.inner_join(media::Entity)
		.filter(media::Column::Name.eq(name))
		.one(app.conn())
		.await
		.expect("should query fine")
		.expect("should have metadata");

	let mut active = metadata.into_active_model();
	active.number = Set(None);
	active
		.update(app.conn())
		.await
		.expect("should have updated fine");
}

async fn setup_murderbot(app: &TestApp) -> (series::Model, Vec<media::Model>) {
	let ret = create_murderbot(app).await;
	fudge_murderbot_position(app, "Home: Habitat, Range, Niche, Territory").await;
	ret
}

async fn setup_science(app: &TestApp) -> (series::Model, Vec<media::Model>) {
	let db = app.conn();

	let image = fake_data::Library {
		id: Some("image".to_string()),
		name: Some("Image".to_string()),
		..Default::default()
	}
	.insert(db)
	.await;

	let (series, books) = setup_single_series_with_n_books(
		&app,
		fake_data::Series {
			id: Some("black_science".to_string()),
			name: Some("Black Science".to_string()),
			library_id: Some(image.id.clone()),
			..Default::default()
		},
		43,
	)
	.await;

	(series, books)
}

fn id_of(books: &Vec<media::Model>, name: &str) -> String {
	books
		.iter()
		.find(|b| b.name == name)
		.map(|b| b.id.clone())
		.expect("{name} should exist")
}

async fn fetch_next_in_series(
	app: &TestApp,
	book_id: &str,
	after: Option<&str>,
	limit: u64,
) -> Result<(Vec<String>, Option<String>), String> {
	let result = app
		.execute_gql(
			r#"
        query NextInSeries($id: ID!, $pagination: Pagination!) {
            mediaById(id: $id) {
                nextInSeries(pagination: $pagination) {
                    nodes {
                        name
                    }
                    pageInfo {
                        ... on CursorPaginationInfo {
                            nextCursor
                        }
                    }
                }
            }
        }
        "#,
			Some(serde_json::json!({
				"id": book_id,
				"pagination": { "cursor": { "after": after, "limit": limit } },
			})),
		)
		.await;

	if let Some(message) = result["errors"][0]["message"].as_str() {
		return Err(message.to_string());
	}

	let next = &result["data"]["mediaById"]["nextInSeries"];
	let names = next["nodes"]
		.as_array()
		.unwrap_or_else(|| panic!("should have had nodes: {result:#}"))
		.iter()
		.map(|node| node["name"].as_str().expect("expected name").to_string())
		.collect();
	let next_cursor = next["pageInfo"]["nextCursor"].as_str().map(String::from);

	Ok((names, next_cursor))
}

/// the books after a cursor in a series prefer to order from series position,
/// and push items not having one last (secondarily sorted by name asc)
#[tokio::test]
async fn test_next_in_series_prefers_metadata_number() {
	let app = TestApp::new_with_default_user().await;
	let (_, books) = setup_murderbot(&app).await;

	let book_id = id_of(&books, "Compulsory");

	let (fetched_names, _) = fetch_next_in_series(&app, &book_id, None, 15)
		.await
		.expect("should fetch a page");

	let mut fudged_canonical_order = murderbot::canonical_order();
	fudged_canonical_order.remove(0);
	// ^ Compulsory is cursor, so we would only see books after it
	let fudged_book = fudged_canonical_order.remove(4);
	fudged_canonical_order.push(fudged_book);
	// nulls are last

	assert_eq!(fetched_names, fudged_canonical_order)
}

/// ordering by name still works as expected if series books lack proper
/// metadata which would otherwise order them
#[tokio::test]
async fn test_next_in_series_orders_by_name_when_no_series_position() {
	let app = TestApp::new_with_default_user().await;
	let (_, books) = setup_science(&app).await;

	let book_id = id_of(&books, "Black Science 001");

	let (fetched_names, _) = fetch_next_in_series(&app, &book_id, None, 43)
		.await
		.expect("should fetch a page");

	let expected_range = (2..44)
		.map(|issue| format!("Black Science {:0>3}", issue))
		.collect::<Vec<_>>();
	assert_eq!(fetched_names, expected_range)
}
