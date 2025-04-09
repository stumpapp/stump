use async_graphql::InputObject;
use chrono::{DateTime, FixedOffset};
use models::{
	entity::{user, user::AuthUser},
	shared::enums::UserPermission,
};
use sea_orm::{prelude::*, ActiveValue::Set};

#[derive(InputObject)]
pub struct AgeRestrictionInput {
	pub age: i32,
	pub restrict_on_unset: bool,
}

#[derive(InputObject)]
pub struct CreateUserInput {
	pub username: String,
	pub password: String,
	pub permissions: Vec<UserPermission>,
	#[graphql(default)]
	pub age_restriction: Option<AgeRestrictionInput>,
	pub max_sessions_allowed: Option<i32>,
}
