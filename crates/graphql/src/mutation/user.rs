use crate::{
	data::{CoreContext, RequestContext},
	guard::{PermissionGuard, SelfGuard, ServerOwnerGuard},
	input::user::CreateUserInput,
	object::user::User,
};
use async_graphql::{Context, Object, Result, SimpleObject, ID};
use models::{
	entity::{
		age_restriction,
		user::{self, AuthUser},
		user_login_activity,
	},
	shared::{enums::UserPermission, permission_set::PermissionSet},
};
use sea_orm::{
	prelude::*, sea_query::OnConflict, ActiveValue::NotSet, Set, TransactionTrait,
	TryIntoModel,
};

#[derive(Default)]
pub struct UserMutation;

#[Object]
impl UserMutation {
	#[graphql(guard = "ServerOwnerGuard")]
	async fn delete_login_activity(&self, ctx: &Context<'_>) -> Result<u64> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let deleted_rows = user_login_activity::Entity::delete_many()
			.exec(conn)
			.await?;
		tracing::debug!("Deleted login activity entries");

		Ok(deleted_rows.rows_affected)
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageUsers)")]
	async fn create_user(
		&self,
		ctx: &Context<'_>,
		input: CreateUserInput,
	) -> Result<User> {
		let core_ctx = ctx.data::<CoreContext>()?;
		let hashed_password =
			bcrypt::hash(input.password, core_ctx.config.password_hash_cost)?;

		let conn = core_ctx.conn.as_ref();

		let permissions = PermissionSet::new(input.permissions);

		let user = user::ActiveModel {
			id: NotSet,
			is_server_owner: Set(false),
			created_at: Set(chrono::Utc::now().into()),
			username: Set(input.username),
			hashed_password: Set(hashed_password),
			permissions: Set(permissions.resolve_into_string()),
			max_sessions_allowed: Set(input.max_sessions_allowed),
			..Default::default()
		};

		let txn = conn.begin().await?;
		let user_model = user
			.save(&txn)
			.await
			.map_err(|e| {
				tracing::error!("Failed to create user: {:?}", e);
				"Failed to create user"
			})?
			.try_into_model()?;
		tracing::debug!(?user_model, "Created user");

		if let Some(ar) = input.age_restriction {
			let created_restriction = age_restriction::ActiveModel {
				id: NotSet,
				user_id: Set(user_model.id.clone()),
				age: Set(ar.age),
				restrict_on_unset: Set(ar.restrict_on_unset),
			}
			.save(&txn)
			.await
			.map_err(|e| {
				tracing::error!("Failed to create age restriction: {:?}", e);
				"Failed to create age restriction"
			})?;
			tracing::trace!(?created_restriction, "Created age restriction");
		}

		let user_preferences = models::entity::user_preferences::ActiveModel {
			id: NotSet,
			user_id: Set(Some(user_model.id.clone())),
			..Default::default()
		};

		user_preferences.save(&txn).await.map_err(|e| {
			tracing::error!(error = ?e, "Failed to create user preferences");
			"Failed to create user preferences"
		})?;

		txn.commit().await?;

		Ok(User::from(user_model.try_into_model()?))
	}

	// TODO(graphql): Implement the following mutations
	// create_user
	// update_current_user
	// update_current_user_preferences
	// update_user_preferences
	// update_current_user_navigation_arrangement
	// update_user_handle
	// delete_user_session
	// update_user_lock_status
	// delete_user_by_id
}
