use chrono::{DateTime, Duration, Utc};
use models::entity::user::AuthUser;
use sea_orm::{DatabaseBackend::Sqlite, MockDatabase, ModelTrait};

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
		is_server_owner: true,
		is_locked: false,
		permissions: vec![],
		age_restriction: None,
	}
}
