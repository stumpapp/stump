use async_graphql::{Context, Guard, Result};
use models::{
	entity::book_club_member,
	shared::{book_club::BookClubMemberRole, enums::UserPermission},
};

use crate::{
	data::{AuthContext, CoreContext},
	error_message,
};

/// Guard that checks if the user is the owner of the server.
pub struct ServerOwnerGuard;

impl Guard for ServerOwnerGuard {
	async fn check(&self, ctx: &Context<'_>) -> Result<()> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;

		if user.is_server_owner {
			Ok(())
		} else {
			Err(error_message::FORBIDDEN_ACTION.into())
		}
	}
}

/// Guard that checks if the user is themselves. This is dependent on the user ID
/// provided and compared with the ID of the current user. So be sure to provide
/// the correct user ID.
pub struct SelfGuard {
	pub user_id: String,
}

impl SelfGuard {
	pub fn new(user_id: &str) -> Self {
		Self {
			user_id: user_id.to_string(),
		}
	}
}

impl Guard for SelfGuard {
	async fn check(&self, ctx: &Context<'_>) -> Result<()> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;

		if user.id == self.user_id {
			Ok(())
		} else {
			Err(error_message::FORBIDDEN_ACTION.into())
		}
	}
}

/// Guard that checks if the user has the required permissions to perform an action.
/// If the user does not have the required permissions, an error is returned.
pub struct PermissionGuard {
	permissions: Vec<UserPermission>,
}

impl PermissionGuard {
	pub fn new(permissions: &[UserPermission]) -> Self {
		Self {
			permissions: permissions.to_vec(),
		}
	}

	pub fn one(permission: UserPermission) -> Self {
		Self {
			permissions: vec![permission],
		}
	}
}

impl Guard for PermissionGuard {
	async fn check(&self, ctx: &Context<'_>) -> Result<()> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;

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

/// Optional features that can be enabled or disabled in the server configuration.
#[derive(Debug, Clone, Copy)]
pub enum OptionalFeature {
	Upload,
	KoReader,
}

/// Guard that checks if an optional feature is enabled in the server configuration.
/// If the feature is disabled, an error is returned.
pub struct OptionalFeatureGuard {
	feature: OptionalFeature,
}

impl OptionalFeatureGuard {
	pub fn new(feature: OptionalFeature) -> Self {
		Self { feature }
	}
}

impl Guard for OptionalFeatureGuard {
	async fn check(&self, ctx: &Context<'_>) -> Result<()> {
		let core = ctx.data::<CoreContext>()?;

		let permitted = match self.feature {
			OptionalFeature::Upload => core.config.enable_upload,
			OptionalFeature::KoReader => core.config.enable_koreader_sync,
		};

		if permitted {
			Ok(())
		} else {
			Err(error_message::DISABLED_FEATURE.into())
		}
	}
}

pub struct BookClubRoleGuard {
	club_id: String,
	role: BookClubMemberRole,
}

impl BookClubRoleGuard {
	pub fn new(club_id: &str, role: BookClubMemberRole) -> Self {
		Self {
			club_id: club_id.to_string(),
			role,
		}
	}
}

impl Guard for BookClubRoleGuard {
	async fn check(&self, ctx: &Context<'_>) -> Result<()> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;

		if user.is_server_owner {
			return Ok(());
		}

		let Some(membership) =
			book_club_member::Entity::find_by_club_for_user(user, &self.club_id)
				.one(core.conn.as_ref())
				.await?
		else {
			return Err(error_message::FORBIDDEN_ACTION.into());
		};

		let is_permitted = membership.role >= self.role && !user.is_locked;

		if is_permitted {
			Ok(())
		} else {
			Err(error_message::FORBIDDEN_ACTION.into())
		}
	}
}
