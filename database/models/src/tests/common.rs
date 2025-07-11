use sea_orm::{
	sea_query::{Condition, Query, SqliteQueryBuilder},
	EntityTrait, QuerySelect, QueryTrait,
};

use crate::entity::user::AuthUser;

pub fn condition_to_string(condition: &Condition) -> String {
	Query::select()
		.cond_where(condition.clone())
		.to_string(SqliteQueryBuilder)
}

pub fn select_no_cols_to_string<EntityType: EntityTrait>(
	select: sea_orm::Select<EntityType>,
) -> String {
	select
		.select_only()
		.into_query()
		.to_string(SqliteQueryBuilder)
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
