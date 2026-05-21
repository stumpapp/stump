use async_graphql::InputType;
use graphql::input::media::MediaProgressInput;
use models::entity::reading_session_v2;
use sea_orm::prelude::*;

use crate::common::TestApp;

pub async fn update_progress(app: &TestApp, book_id: &str, input: MediaProgressInput) {
	let json_input = input
		.to_value()
		.into_json()
		.expect("failed to convert to json");
	let result = app
		.execute_gql(
			r#"
        mutation UpdateMediaProgress($id: String!, $input: MediaProgressInput!) {
            updateMediaProgress(id: $id, input: $input) {
                __typename
            }
        }
        "#,
			Some(serde_json::json!({
				"id": book_id,
				"input": json_input,
			})),
		)
		.await;
	assert!(result.get("data").is_some_and(|data| !data.is_null())); // i.e. it worked
}

/// fudge the session updated_at to be outside the guard period where the server
/// attempts to block creating a new session after completion as a form of deduplication etc
pub async fn fudge_session_time(
	session: &reading_session_v2::Model,
	conn: &sea_orm::DatabaseConnection,
) {
	let fudge_time = session.updated_at.expect("session missing updated_at")
		- chrono::Duration::minutes(40);
	reading_session_v2::Entity::update_many()
		.filter(reading_session_v2::Column::Id.eq(session.id))
		.col_expr(
			reading_session_v2::Column::UpdatedAt,
			Expr::value(fudge_time),
		)
		.exec(conn)
		.await
		.expect("could not update session timestamp");
}
