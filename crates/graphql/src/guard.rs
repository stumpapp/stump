use async_graphql::{Context, Guard, Result};
use models::shared::enums::UserPermission;

use crate::{data::RequestContext, error_message};

pub struct ServerOwnerGuard;

impl Guard for ServerOwnerGuard {
	async fn check(&self, ctx: &Context<'_>) -> Result<()> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;

		if user.is_server_owner {
			Ok(())
		} else {
			Err(error_message::FORBIDDEN_ACTION.into())
		}
	}
}

pub struct PermissionGuard {
	permissions: Vec<UserPermission>,
}

impl PermissionGuard {
	pub fn new(permissions: Vec<UserPermission>) -> Self {
		Self { permissions }
	}

	pub fn one(permission: UserPermission) -> Self {
		Self {
			permissions: vec![permission],
		}
	}
}

impl Guard for PermissionGuard {
	async fn check(&self, ctx: &Context<'_>) -> Result<()> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;

		if user.is_server_owner {
			return Ok(());
		}

		let authorized = self
			.permissions
			.iter()
			.any(|p| user.permissions.contains(p));
		let permitted = authorized && !user.is_locked;

		if permitted {
			Ok(())
		} else {
			Err(error_message::FORBIDDEN_ACTION.into())
		}
	}
}
