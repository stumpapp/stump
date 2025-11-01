use crate::{
	data::{AuthContext, CoreContext},
	error_message::FORBIDDEN_ACTION,
	guard::{PermissionGuard, ServerOwnerGuard},
	input::user::{
		AgeRestrictionInput, CreateUserInput, NavigationArrangementInput,
		UpdateUserInput, UpdateUserPreferencesInput,
	},
	object::{user::User, user_preferences::UserPreferences},
	utils::save_user_session,
};
use async_graphql::{Context, Object, Result, ID};
use models::{
	entity::{
		age_restriction, session,
		user::{self, AuthUser},
		user_login_activity, user_preferences,
	},
	shared::{
		arrangement::Arrangement, enums::UserPermission, permission_set::PermissionSet,
	},
};
use sea_orm::{
	prelude::*, ActiveValue::NotSet, DatabaseTransaction, IntoActiveModel, Set,
	TransactionTrait, TryIntoModel,
};
use stump_core::config::StumpConfig;
use tower_sessions::Session;

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

	async fn update_viewer(
		&self,
		ctx: &Context<'_>,
		input: UpdateUserInput,
	) -> Result<User> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core_ctx = ctx.data::<CoreContext>()?;
		let config = core_ctx.config.as_ref();
		let conn = core_ctx.conn.as_ref();

		let updated_user =
			update_user(user, user.id.clone(), conn, config, &input).await?;

		// TODO(graphql): Insert user session

		Ok(updated_user)
	}

	async fn update_viewer_preferences(
		&self,
		ctx: &Context<'_>,
		input: UpdateUserPreferencesInput,
	) -> Result<UserPreferences> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let session = ctx.data::<Session>()?;
		let core_ctx = ctx.data::<CoreContext>()?;
		let conn = core_ctx.conn.as_ref();

		let user_preferences = user_preferences::Entity::find()
			.filter(user_preferences::Column::UserId.eq(user.id.clone()))
			.one(conn)
			.await?;

		if let Some(user_preferences_model) = user_preferences {
			tracing::trace!(user_id = ?user.id, ?user_preferences_model, updates = ?input, "Updating viewer's preferences");

			let updated_user_preferences = update_user_preferences_by_id(
				user_preferences_model.id,
				user.id.clone(),
				input,
				conn,
			)
			.await?;

			save_user_session(
				session,
				AuthUser {
					preferences: Some(updated_user_preferences.model.clone()),
					..user.clone()
				},
			)
			.await;

			Ok(updated_user_preferences)
		} else {
			Err("User preferences not found".into())
		}
	}

	async fn update_user(
		&self,
		ctx: &Context<'_>,
		id: ID,
		input: UpdateUserInput,
	) -> Result<User> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core_ctx = ctx.data::<CoreContext>()?;
		let config = core_ctx.config.as_ref();
		let conn = core_ctx.conn.as_ref();

		if user.id != id.to_string() && !user.is_server_owner {
			return Err(FORBIDDEN_ACTION.into());
		}

		let updated_user =
			update_user(user, id.to_string(), conn, config, &input).await?;
		tracing::debug!(?updated_user, "Updated user");

		if user.id != id.to_string() {
			// When a server owner updates another user, we need to delete all sessions for that user
			// because the user's permissions may have changed. This is a bit lazy but it works.
			remove_all_session_for_user(id.to_string(), conn).await?;
		} else {
			// TODO(graphql): Insert user session
		}

		Ok(updated_user)
	}

	#[graphql(guard = "ServerOwnerGuard")]
	async fn delete_user(
		&self,
		ctx: &Context<'_>,
		id: ID,
		hard_delete: Option<bool>,
	) -> Result<User> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core_ctx = ctx.data::<CoreContext>()?;
		let conn = core_ctx.conn.as_ref();

		if id.to_string() == user.id {
			return Err("You cannot delete your own account".into());
		}

		let hard_delete = hard_delete.unwrap_or(false);

		let existing_user = user::Entity::find()
			.filter(user::Column::Id.eq(id.to_string()))
			.one(conn)
			.await?
			.ok_or("User not found")?;

		if existing_user.is_server_owner {
			return Err("You cannot delete the server owner".into());
		}

		let deleted_user = if hard_delete {
			user::Entity::delete_by_id(id.to_string())
				.exec_with_returning(conn)
				.await?
				.first()
				.ok_or("Failed to delete user".to_string())?
				.clone()
		} else {
			let mut active_model = existing_user.into_active_model();
			active_model.deleted_at = Set(Some(chrono::Utc::now().into()));
			active_model.update(conn).await?.try_into_model()?
		};

		tracing::debug!(?deleted_user, "Deleted user");
		Ok(User::from(deleted_user))
	}

	#[graphql(guard = "ServerOwnerGuard")]
	async fn delete_user_sessions(&self, ctx: &Context<'_>, id: ID) -> Result<u64> {
		let core_ctx = ctx.data::<CoreContext>()?;
		let conn = core_ctx.conn.as_ref();

		let removed_sessions = remove_all_session_for_user(id.to_string(), conn).await?;
		Ok(removed_sessions.len().try_into()?)
	}

	#[graphql(guard = "ServerOwnerGuard")]
	async fn update_user_lock_status(
		&self,
		ctx: &Context<'_>,
		id: ID,
		lock: bool,
	) -> Result<User> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core_ctx = ctx.data::<CoreContext>()?;
		let conn = core_ctx.conn.as_ref();

		if id.to_string() == user.id {
			return Err("You cannot lock your own account".into());
		}

		let model = user::Entity::find()
			.filter(user::Column::Id.eq(id.to_string()))
			.one(conn)
			.await?
			.ok_or("User not found")?;
		let mut active_model = model.into_active_model();
		active_model.is_locked = Set(lock);

		if lock {
			// Delete all sessions for this user if they are being locked
			remove_all_session_for_user(id.to_string(), conn).await?;
		}

		let updated_user = active_model.update(conn).await?;

		Ok(User::from(updated_user))
	}

	async fn update_navigation_arrangement_lock(
		&self,
		ctx: &Context<'_>,
		locked: bool,
	) -> Result<Arrangement> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;

		let preferences = user_preferences::Entity::find()
			.filter(user_preferences::Column::UserId.eq(&user.id))
			.one(conn)
			.await?
			.ok_or("User preferences not found")?;

		let updated_arrangement = match preferences.navigation_arrangement {
			Some(ref arrangement) => Arrangement {
				locked,
				..arrangement.clone()
			},
			None => Arrangement {
				locked,
				..Arrangement::default_navigation()
			},
		};

		let mut active_model = preferences.into_active_model();
		active_model.navigation_arrangement = Set(Some(updated_arrangement.clone()));
		active_model.update(conn).await?;

		Ok(updated_arrangement)
	}

	async fn update_navigation_arrangement(
		&self,
		ctx: &Context<'_>,
		input: NavigationArrangementInput,
	) -> Result<Arrangement> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;

		let preferences = user_preferences::Entity::find()
			.filter(user_preferences::Column::UserId.eq(&user.id))
			.one(conn)
			.await?
			.ok_or("User preferences not found")?;

		let arrangement = preferences
			.navigation_arrangement
			.clone()
			.unwrap_or_else(Arrangement::default_navigation);

		if arrangement.locked {
			return Err("Navigation arrangement is locked".into());
		}

		let updated_arrangement = Arrangement {
			locked: arrangement.locked,
			sections: input.sections,
		};

		let mut active_model = preferences.into_active_model();
		active_model.navigation_arrangement = Set(Some(updated_arrangement.clone()));

		active_model.update(conn).await?;

		Ok(updated_arrangement)
	}
}

async fn remove_all_session_for_user(
	id: String,
	conn: &DatabaseConnection,
) -> Result<Vec<session::Model>> {
	let removed_sessions = session::Entity::delete_many()
		.filter(session::Column::UserId.eq(id.clone()))
		.exec_with_returning(conn)
		.await?;

	tracing::debug!(?removed_sessions, "Removed sessions for user");
	Ok(removed_sessions)
}

async fn update_user_preferences_by_id(
	id: i32,
	user_id: String,
	user_preferences: UpdateUserPreferencesInput,
	conn: &DatabaseConnection,
) -> Result<UserPreferences> {
	// FIXME(graphql): I think this will overwrite the NotSet values if they are
	// currently set
	let updated_user_preferences = user_preferences::ActiveModel {
		id: Set(id),
		user_id: Set(Some(user_id)),
		locale: Set(user_preferences.locale),
		preferred_layout_mode: Set(user_preferences.preferred_layout_mode),
		app_theme: Set(user_preferences.app_theme),
		enable_gradients: Set(user_preferences.enable_gradients),
		app_font: Set(user_preferences.app_font),
		primary_navigation_mode: Set(user_preferences.primary_navigation_mode),
		layout_max_width_px: Set(user_preferences.layout_max_width_px),
		show_query_indicator: Set(user_preferences.show_query_indicator),
		enable_live_refetch: Set(user_preferences.enable_live_refetch),
		enable_discord_presence: Set(user_preferences.enable_discord_presence),
		enable_compact_display: Set(user_preferences.enable_compact_display),
		enable_double_sidebar: Set(user_preferences.enable_double_sidebar),
		enable_replace_primary_sidebar: Set(
			user_preferences.enable_replace_primary_sidebar
		),
		enable_hide_scrollbar: Set(user_preferences.enable_hide_scrollbar),
		enable_job_overlay: Set(user_preferences.enable_job_overlay),
		prefer_accent_color: Set(user_preferences.prefer_accent_color),
		show_thumbnails_in_headers: Set(user_preferences.show_thumbnails_in_headers),
		thumbnail_ratio: Set(user_preferences.thumbnail_ratio),
		enable_alphabet_select: Set(user_preferences.enable_alphabet_select),
		home_arrangement: NotSet,
		navigation_arrangement: NotSet,
	};

	let updated_user_prefs = updated_user_preferences.update(conn).await?;

	Ok(UserPreferences::from(updated_user_prefs))
}

async fn update_user(
	by_user: &AuthUser,
	for_user_id: String,
	conn: &DatabaseConnection,
	config: &StumpConfig,
	input: &UpdateUserInput,
) -> Result<User> {
	// NOTE: there are other mechanisms in place to effectively disable logging in,
	// so I am making this a bad request. In the future, perhaps this can change.
	match input.max_sessions_allowed {
		Some(max_sessions_allowed) if max_sessions_allowed <= 0 => {
			return Err("max_sessions_allowed must be greater than 0 when set".into());
		},
		Some(max_sessions_allowed) => {
			tracing::trace!(?max_sessions_allowed, "The max sessions allowed is set");
		},
		_ => {},
	}

	let mut update_user = user::ActiveModel {
		id: Set(for_user_id.clone()),
		username: Set(input.username.clone()),
		avatar_url: Set(input.avatar_url.clone()),
		max_sessions_allowed: Set(input.max_sessions_allowed),
		..Default::default()
	};

	if let Some(password) = input.password.clone() {
		let hashed_password = bcrypt::hash(password, config.password_hash_cost)?;
		update_user.hashed_password = Set(hashed_password);
	}

	let txn = conn.begin().await?;

	let is_updating_server_owner = by_user.is_server_owner && by_user.id == for_user_id;
	if !is_updating_server_owner {
		update_user_age_restriction(&for_user_id, &input.age_restriction, &txn).await?;

		let permissions = PermissionSet::new(input.permissions.clone());
		update_user.permissions = Set(permissions.resolve_into_string());
	}

	let updated_user_entity = update_user.update(&txn).await?;

	txn.commit().await?;

	Ok(User::from(updated_user_entity))
}

async fn update_user_age_restriction(
	user_id: &str,
	age_restriction: &Option<AgeRestrictionInput>,
	txn: &DatabaseTransaction,
) -> Result<()> {
	let existing_age_restriction = age_restriction::Entity::find()
		.filter(age_restriction::Column::UserId.eq(user_id))
		.one(txn)
		.await?;

	if let Some(age_restriction) = age_restriction {
		let set_age_restriction_id = if let Some(restriction) = existing_age_restriction {
			Set(restriction.id)
		} else {
			NotSet
		};

		let _ = age_restriction::ActiveModel {
			id: set_age_restriction_id,
			user_id: Set(user_id.to_string()),
			age: Set(age_restriction.age),
			restrict_on_unset: Set(age_restriction.restrict_on_unset),
		}
		.save(txn)
		.await
		.map_err(|e| {
			tracing::error!("Failed to save age restriction: {:?}", e);
			"Failed to save age restriction"
		})?;

		Ok(())
	} else if let Some(existing_restriction) = existing_age_restriction {
		// delete age restriction
		let result = age_restriction::Entity::delete_by_id(existing_restriction.id)
			.exec(txn)
			.await
			.map_err(|e| {
				tracing::error!("Failed to delete age restriction: {:?}", e);
				"Failed to delete age restriction"
			})?;

		if result.rows_affected != 1 {
			return Err("Failed to delete age restriction".into());
		}

		Ok(())
	} else {
		Ok(())
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::tests::common::*;
	use sea_orm::{DatabaseBackend::Sqlite, MockDatabase};

	#[tokio::test]
	async fn test_update_age_restriction() {
		let conn = MockDatabase::new(Sqlite)
			.append_query_results::<age_restriction::Model, Vec<_>, Vec<Vec<_>>>(vec![
				vec![],
			])
			.append_exec_results(vec![sea_orm::MockExecResult {
				last_insert_id: 0,
				rows_affected: 1,
			}])
			.into_connection();
		let txn = conn.begin().await.unwrap();
		update_user_age_restriction("42", &None, &txn)
			.await
			.unwrap();
		txn.commit().await.unwrap();

		let txns = conn.into_transaction_log();
		assert_eq!(txns.len(), 1);
		let txn = &txns[0];
		assert_eq!(txn.statements().len(), 3); // begin commit, select, commit
		let stmt = &txn.statements()[1];
		assert_eq!(
			stmt.to_string(),
			r#"SELECT "age_restrictions"."id", "age_restrictions"."age", "age_restrictions"."restrict_on_unset", "age_restrictions"."user_id" FROM "age_restrictions" WHERE "age_restrictions"."user_id" = '42' LIMIT 1"#.to_string()
		);
	}

	#[tokio::test]
	async fn test_update_age_restriction_delete_existing() {
		let conn = MockDatabase::new(Sqlite)
			.append_query_results::<age_restriction::Model, Vec<_>, Vec<Vec<_>>>(vec![
				vec![age_restriction::Model {
					id: 1337,
					user_id: "42".to_string(),
					age: 18,
					restrict_on_unset: true,
				}],
			])
			.append_exec_results(vec![sea_orm::MockExecResult {
				last_insert_id: 0,
				rows_affected: 1,
			}])
			.into_connection();
		let txn = conn.begin().await.unwrap();
		update_user_age_restriction("42", &None, &txn)
			.await
			.unwrap();
		txn.commit().await.unwrap();

		let delete_stmt = conn.into_transaction_log()[0].statements()[2].clone();
		assert_eq!(
			delete_stmt.to_string(),
			r#"DELETE FROM "age_restrictions" WHERE "age_restrictions"."id" = 1337"#
				.to_string()
		);
	}

	#[tokio::test]
	async fn test_update_user_server_owner() {
		let conn = MockDatabase::new(Sqlite)
			.append_query_results::<user::Model, Vec<_>, Vec<Vec<_>>>(vec![vec![
				user::Model {
					id: "42".to_string(),
					username: "test_user".to_string(),
					hashed_password: "hashed_password".to_string(),
					is_server_owner: false,
					is_locked: false,
					permissions: None,
					max_sessions_allowed: None,
					avatar_url: None,
					created_at: chrono::Utc::now().into(),
					deleted_at: None,
					user_preferences_id: None,
				},
			]])
			.into_connection();
		let config = StumpConfig::debug();

		let input = UpdateUserInput {
			username: "test_user".to_string(),
			password: None,
			max_sessions_allowed: Some(5),
			avatar_url: Some("http://example.com/avatar.png".to_string()),
			permissions: vec![],
			age_restriction: None,
		};

		let user = get_default_user();

		let updated_user = update_user(&user, user.id.clone(), &conn, &config, &input)
			.await
			.unwrap();

		assert_eq!(updated_user.model.username, "test_user");
		let txns = conn.into_transaction_log();
		assert_eq!(txns.len(), 1);
		let txn = txns.first().unwrap();
		assert_eq!(txn.statements().len(), 3);
		let stmt = &txn.statements()[1];
		assert_eq!(
			stmt.to_string(),
			r#"UPDATE "users" SET "username" = 'test_user', "avatar_url" = 'http://example.com/avatar.png', "max_sessions_allowed" = 5 WHERE "users"."id" = '42' RETURNING "id", "username", "hashed_password", "is_server_owner", "avatar_url", "created_at", "deleted_at", "is_locked", "max_sessions_allowed", "permissions", "user_preferences_id""#
		);
	}
}
