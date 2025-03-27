use async_graphql::{ComplexObject, Context, Result, SimpleObject};

use models::{
	entity::user_preferences,
	shared::{enums::UserPermission, permission_set::PermissionSet},
};

use crate::{
	guard::{PermissionGuard, SelfGuard, ServerOwnerGuard},
	pagination::{PaginatedResponse, Pagination, PaginationValidator},
	query::media::MediaQuery,
};

use super::media::Media;

#[derive(Debug, SimpleObject)]
pub struct UserPreferences {
	#[graphql(flatten)]
	pub model: user_preferences::Model,
}

impl From<user_preferences::Model> for UserPreferences {
	fn from(entity: user_preferences::Model) -> Self {
		Self { model: entity }
	}
}
