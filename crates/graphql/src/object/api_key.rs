use async_graphql::{ComplexObject, Context, SimpleObject, Union};
use models::{
	entity::api_key,
	shared::{
		api_key::{APIKeyPermissions, InheritPermissionValue},
		enums::UserPermission,
	},
};

#[derive(Debug, Clone, SimpleObject)]
#[graphql(complex)]
pub struct APIKey {
	#[graphql(flatten)]
	pub model: api_key::Model,
}

impl From<api_key::Model> for APIKey {
	fn from(entity: api_key::Model) -> Self {
		Self { model: entity }
	}
}

#[derive(Debug, Copy, Clone, PartialEq, Eq, SimpleObject)]
pub struct InheritPermissionStruct {
	value: InheritPermissionValue,
}

#[derive(Debug, Clone, PartialEq, Eq, SimpleObject)]
pub struct UserPermissionStruct {
	value: Vec<UserPermission>,
}

#[derive(Debug, Clone, PartialEq, Eq, Union)]
pub enum APIKeyPermissionsOutput {
	Inherit(InheritPermissionStruct),
	Custom(UserPermissionStruct),
}

impl From<APIKeyPermissions> for APIKeyPermissionsOutput {
	fn from(permissions: APIKeyPermissions) -> Self {
		match permissions {
			APIKeyPermissions::Inherit(value) => {
				APIKeyPermissionsOutput::Inherit(InheritPermissionStruct { value })
			},
			APIKeyPermissions::Custom(value) => {
				APIKeyPermissionsOutput::Custom(UserPermissionStruct { value })
			},
		}
	}
}

#[ComplexObject]
impl APIKey {
	pub async fn permissions(&self, _ctx: &Context<'_>) -> APIKeyPermissionsOutput {
		self.model.permissions.clone().into()
	}
}

#[derive(Debug, Clone, SimpleObject)]
pub struct CreatedAPIKey {
	pub api_key: APIKey,
	pub secret: String,
}
