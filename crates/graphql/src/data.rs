use std::sync::Arc;

use async_graphql::Result;
use models::{
	entity::user::AuthUser,
	shared::{enums::UserPermission, permission_set::user_has_all_permissions},
};
use stump_core::Ctx;

use crate::error_message;

pub type CoreContext = Arc<Ctx>;

pub struct RequestContext {
	pub user: AuthUser,
	pub api_key: Option<String>,
}

impl RequestContext {
	/// Get the current user
	pub fn user(&self) -> AuthUser {
		self.user.clone()
	}

	/// Get the ID of the current user
	pub fn id(&self) -> String {
		self.user.id.clone()
	}

	pub fn api_key(&self) -> Option<String> {
		self.api_key.clone()
	}

	/// Enforce that the current user has all the permissions provided, otherwise return an error
	#[tracing::instrument(skip(self))]
	pub fn enforce_permissions(&self, permissions: &[UserPermission]) -> Result<()> {
		let user = self.user();

		if user.is_server_owner {
			return Ok(());
		}

		if user.is_locked {
			return Err(error_message::LOCKED_ACCOUNT.into());
		}

		if user_has_all_permissions(&user, permissions) {
			Ok(())
		} else {
			Err(error_message::FORBIDDEN_ACTION.into())
		}
	}

	/// Get the current user and enforce that they have all the permissions provided, otherwise
	/// return an error
	#[tracing::instrument(skip(self))]
	pub fn user_and_enforce_permissions(
		&self,
		permissions: &[UserPermission],
	) -> Result<AuthUser> {
		self.enforce_permissions(permissions)?;
		Ok(self.user())
	}

	/// Enforce that the current user is the server owner, otherwise return an error
	#[tracing::instrument(skip(self))]
	pub fn enforce_server_owner(&self) -> Result<()> {
		let user = self.user();

		if user.is_server_owner {
			Ok(())
		} else {
			tracing::error!(
				username = &user.username,
				"User is not server owner, denying access"
			);
			Err(error_message::FORBIDDEN_ACTION.into())
		}
	}

	/// Get the current user and enforce that they are the server owner, otherwise return an error
	#[tracing::instrument(skip(self))]
	pub fn server_owner_user(&self) -> Result<AuthUser> {
		self.enforce_server_owner()?;
		Ok(self.user())
	}
}
