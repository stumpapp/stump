use crate::{data::AuthContext, schema::add_data_loaders};
use async_graphql::{EmptyMutation, EmptySubscription, ObjectType, Request, Schema};
use chrono::{DateTime, Duration, Utc};
use models::entity::user::AuthUser;
use sea_orm::{DatabaseBackend::Sqlite, MockDatabase, ModelTrait};
use std::{path::PathBuf, sync::Arc};
use stump_core::Ctx;

pub fn is_close_to_now(time: DateTime<Utc>) -> bool {
	let now = Utc::now();
	let duration = time.signed_duration_since(now);

	duration.abs() < Duration::minutes(1)
}

pub fn get_mock_db_for_model<ModelType: ModelTrait>(
	models: Vec<ModelType>,
) -> MockDatabase {
	MockDatabase::new(Sqlite).append_query_results::<ModelType, _, _>(vec![models])
}

pub fn get_default_user() -> AuthUser {
	AuthUser {
		id: "42".to_string(),
		username: "test".to_string(),
		avatar_url: None,
		is_server_owner: true,
		is_locked: false,
		permissions: vec![],
		age_restriction: None,
		preferences: None,
	}
}

pub async fn get_graphql_query_response<QueryType: ObjectType + 'static>(
	query: QueryType,
	req_str: String,
	db: MockDatabase,
	user: AuthUser,
) -> String {
	let core_ctx = Arc::new(Ctx::mock_sea(db));
	let req_ctx = AuthContext {
		user: user.clone(),
		api_key: None,
	};

	let mut req = Request::new(req_str);
	req = req.data(req_ctx);

	let conn = core_ctx.conn.clone();
	let schema_builder =
		Schema::build(query, EmptyMutation, EmptySubscription).data(core_ctx);
	let schema = add_data_loaders(schema_builder, conn).finish();

	let response = schema.execute(req).await;
	serde_json::to_string_pretty(&response).unwrap()
}

pub fn get_test_epub_path() -> String {
	PathBuf::from(env!("CARGO_MANIFEST_DIR"))
		.join("../../core/integration-tests/data/book.epub")
		.to_string_lossy()
		.to_string()
}
