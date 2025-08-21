use std::{fs::File, io::Write};

use axum::{
	extract::{DefaultBodyLimit, Multipart, Path, State},
	middleware,
	routing::{delete, get, put},
	Extension, Json, Router,
};
use axum_extra::extract::Query;
use prisma_client_rust::{chrono::Utc, Direction};
use serde::Deserialize;
use specta::Type;
use stump_core::{
	config::StumpConfig,
	db::{
		entity::{
			AgeRestriction, Arrangement, LoginActivity, NavigationItem, SupportedFont,
			User, UserPermission, UserPreferences,
		},
		query::pagination::{Pageable, Pagination, PaginationQuery},
	},
	filesystem::{get_unknown_image, ContentType, FileParts, PathUtils},
	prisma::{
		age_restriction, session, user, user_login_activity, user_preferences,
		PrismaClient,
	},
};
use tokio::fs;
use tower_sessions::Session;
use tracing::{debug, trace};
use utoipa::ToSchema;

use crate::{
	config::{session::SESSION_USER_KEY, state::AppState},
	errors::{APIError, APIResult},
	filter::{chain_optional_iter, UserQueryRelation},
	middleware::auth::{auth_middleware, AuthContext},
	utils::{get_session_user, http::ImageResponse, validate_and_load_image},
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.route("/users", get(get_users).post(create_user))
		.route(
			"/users/login-activity",
			get(get_user_login_activity).delete(delete_user_login_activity),
		)
		.nest(
			"/users/me",
			Router::new()
				.route("/", put(update_current_user))
				.route("/preferences", put(update_current_user_preferences))
				.route(
					"/navigation-arrangement",
					get(get_navigation_arrangement).put(update_navigation_arrangement),
				),
		)
		.nest(
			"/users/{id}",
			Router::new()
				.route(
					"/",
					get(get_user_by_id)
						.put(update_user_handler)
						.delete(delete_user_by_id),
				)
				.route("/sessions", delete(delete_user_sessions))
				.route("/lock", put(update_user_lock_status))
				.route("/login-activity", get(get_user_login_activity_by_id))
				.route(
					"/preferences",
					get(get_user_preferences).put(update_user_preferences),
				)
				.route(
					"/avatar",
					get(get_user_avatar).post(upload_user_avatar).layer(
						DefaultBodyLimit::max(app_state.config.max_image_upload_size),
					),
				),
		)
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
}

pub(crate) fn apply_pagination<'a>(
	query: user::FindMany<'a>,
	pagination: &Pagination,
) -> user::FindMany<'a> {
	match pagination {
		Pagination::Page(page_query) => {
			let (skip, take) = page_query.get_skip_take();
			query.skip(skip).take(take)
		},
		Pagination::Cursor(cursor_params) => {
			let mut cursor_query = query;
			if let Some(cursor) = cursor_params.cursor.as_deref() {
				cursor_query = cursor_query
					.cursor(user::id::equals(cursor.to_string()))
					.skip(1);
			}
			if let Some(limit) = cursor_params.limit {
				cursor_query = cursor_query.take(limit);
			}
			cursor_query
		},
		_ => query,
	}
}

#[utoipa::path(
	get,
	path = "/api/v1/users",
	tag = "user",
	params(
		("pagination_query" = Option<PaginationQuery>, Query, description = "The pagination query"),
		("relation_query" = Option<UserQueryRelation>, Query, description = "The relations to include"),
	),
	responses(
		(status = 200, description = "Successfully fetched users", body = [User]),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 500, description = "Internal server error"),
	)
)]
async fn get_users(
	State(ctx): State<AppState>,
	relation_query: Query<UserQueryRelation>,
	pagination_query: Query<PaginationQuery>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<Pageable<Vec<User>>>> {
	req.enforce_permissions(&[UserPermission::ReadUsers])?;

	let pagination = pagination_query.0.get();
	let is_unpaged = pagination.is_unpaged();
	let pagination_cloned = pagination.clone();

	tracing::debug!(?relation_query, "get_users");

	let include_user_read_progress =
		relation_query.include_read_progresses.unwrap_or_default();
	let include_session_count = relation_query.include_session_count.unwrap_or_default();
	let include_restrictions = relation_query.include_restrictions.unwrap_or_default();

	let (users, count) = ctx
		.db
		._transaction()
		.run(|client| async move {
			let mut query = client.user().find_many(vec![]);

			if include_user_read_progress {
				query = query
					.with(user::active_reading_sessions::fetch(vec![]))
					.with(user::finished_reading_sessions::fetch(vec![]));
			}

			if include_session_count {
				query = query.with(user::sessions::fetch(vec![]));
			}

			if include_restrictions {
				query = query.with(user::age_restriction::fetch());
			}

			if !is_unpaged {
				query = apply_pagination(query, &pagination_cloned);
			}

			let users = query.exec().await?.into_iter().map(User::from).collect();

			if is_unpaged {
				return Ok((users, None));
			}

			client
				.user()
				.count(vec![])
				.exec()
				.await
				.map(|count| (users, Some(count)))
		})
		.await?;

	if let Some(count) = count {
		return Ok(Json(Pageable::from((users, count, pagination))));
	}

	Ok(Json(Pageable::from(users)))
}

// TODO: pagination!
#[utoipa::path(
	get,
	path = "/api/v1/users/login-activity",
	tag = "user",
	responses(
		(status = 200, description = "Successfully fetched login activity"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 500, description = "Internal server error"),
	)
)]
async fn get_user_login_activity(
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<Vec<LoginActivity>>> {
	req.enforce_server_owner()?;

	let client = &ctx.db;

	let user_activity = client
		.user_login_activity()
		.find_many(vec![])
		.with(user_login_activity::user::fetch())
		.order_by(user_login_activity::timestamp::order(Direction::Desc))
		.exec()
		.await?;

	Ok(Json(
		user_activity.into_iter().map(LoginActivity::from).collect(),
	))
}

#[utoipa::path(
	delete,
	path = "/api/v1/users/login-activity",
	tag = "user",
	responses(
		(status = 200, description = "Successfully deleted user login activity"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 500, description = "Internal server error"),
	)
)]
async fn delete_user_login_activity(
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<()>> {
	req.enforce_server_owner()?;

	let client = &ctx.db;

	client
		.user_login_activity()
		.delete_many(vec![])
		.exec()
		.await?;

	Ok(Json(()))
}

#[derive(Deserialize, Type, ToSchema)]
pub struct UpdateUser {
	pub username: String,
	pub password: Option<String>,
	pub avatar_url: Option<String>,
	#[serde(default)]
	pub permissions: Vec<UserPermission>,
	pub age_restriction: Option<AgeRestriction>,
	#[serde(default)]
	pub max_sessions_allowed: Option<i32>,
}

async fn update_user(
	by_user: &User,
	client: &PrismaClient,
	for_user_id: String,
	input: UpdateUser,
	config: &StumpConfig,
) -> APIResult<User> {
	// NOTE: there are other mechanisms in place to effectively disable logging in,
	// so I am making this a bad request. In the future, perhaps this can change.
	match input.max_sessions_allowed {
		Some(max_sessions_allowed) if max_sessions_allowed <= 0 => {
			return Err(APIError::BadRequest(
				"max_sessions_allowed must be greater than 0 when set".to_string(),
			))
		},
		Some(max_sessions_allowed) => {
			tracing::trace!(?max_sessions_allowed, "The max sessions allowed is set");
		},
		_ => {},
	}

	let mut update_params = vec![
		user::username::set(input.username),
		user::avatar_url::set(input.avatar_url),
		user::max_sessions_allowed::set(input.max_sessions_allowed),
	];
	if let Some(password) = input.password {
		let hashed_password = bcrypt::hash(password, config.password_hash_cost)?;
		update_params.push(user::hashed_password::set(hashed_password));
	}

	let to_update_is_server_owner = by_user.is_server_owner && by_user.id == for_user_id;
	if to_update_is_server_owner {
		let updated_user_data = client
			.user()
			.update(user::id::equals(for_user_id), update_params)
			// NOTE: we have to fetch preferences because if we update session without
			// it then it effectively removes the preferences from the session
			.with(user::user_preferences::fetch())
			.exec()
			.await?;

		Ok(User::from(updated_user_data))
	} else {
		let updated_user_data = client
			._transaction()
			.run(|tx| async move {
				let existing_age_restriction = tx
					.age_restriction()
					.find_unique(age_restriction::user_id::equals(for_user_id.clone()))
					.exec()
					.await?;

				if let Some(age_restriction) = input.age_restriction {
					let upserted_age_restriction = tx
						.age_restriction()
						.upsert(
							age_restriction::user_id::equals(for_user_id.clone()),
							(
								age_restriction.age,
								user::id::equals(for_user_id.clone()),
								vec![age_restriction::restrict_on_unset::set(
									age_restriction.restrict_on_unset,
								)],
							),
							vec![
								age_restriction::age::set(age_restriction.age),
								age_restriction::restrict_on_unset::set(
									age_restriction.restrict_on_unset,
								),
							],
						)
						.exec()
						.await?;
					tracing::trace!(
						?upserted_age_restriction,
						"Upserted age restriction"
					);
				} else if existing_age_restriction.is_some() {
					tx.age_restriction()
						.delete(age_restriction::user_id::equals(for_user_id.clone()))
						.exec()
						.await?;
					tracing::trace!("Deleted age restriction");
				}

				update_params.push(user::permissions::set(Some(
					input
						.permissions
						.into_iter()
						.map(|p| p.to_string())
						.collect::<Vec<String>>()
						.join(","),
				)));

				tx.user()
					.update(user::id::equals(for_user_id), update_params)
					.with(user::user_preferences::fetch())
					.with(user::age_restriction::fetch())
					.exec()
					.await
			})
			.await?;
		Ok(User::from(updated_user_data))
	}
}

async fn update_preferences(
	client: &PrismaClient,
	preferences_id: String,
	input: UpdateUserPreferences,
) -> APIResult<UserPreferences> {
	let updated_preferences = client
		.user_preferences()
		.update(
			user_preferences::id::equals(preferences_id),
			vec![
				user_preferences::locale::set(input.locale.clone()),
				user_preferences::preferred_layout_mode::set(
					input.preferred_layout_mode.clone(),
				),
				user_preferences::app_theme::set(input.app_theme.clone()),
				user_preferences::enable_gradients::set(input.enable_gradients),
				user_preferences::app_font::set(input.app_font.to_string()),
				user_preferences::primary_navigation_mode::set(
					input.primary_navigation_mode.clone(),
				),
				user_preferences::layout_max_width_px::set(input.layout_max_width_px),
				user_preferences::show_query_indicator::set(input.show_query_indicator),
				user_preferences::enable_live_refetch::set(input.enable_live_refetch),
				user_preferences::enable_discord_presence::set(
					input.enable_discord_presence,
				),
				user_preferences::enable_compact_display::set(
					input.enable_compact_display,
				),
				user_preferences::enable_double_sidebar::set(input.enable_double_sidebar),
				user_preferences::enable_replace_primary_sidebar::set(
					input.enable_replace_primary_sidebar,
				),
				user_preferences::enable_hide_scrollbar::set(input.enable_hide_scrollbar),
				user_preferences::enable_job_overlay::set(input.enable_job_overlay),
				user_preferences::prefer_accent_color::set(input.prefer_accent_color),
				user_preferences::show_thumbnails_in_headers::set(
					input.show_thumbnails_in_headers,
				),
			],
		)
		.exec()
		.await?;

	Ok(UserPreferences::from(updated_preferences))
}

#[derive(Deserialize, Type, ToSchema)]
pub struct CreateUser {
	pub username: String,
	pub password: String,
	#[serde(default)]
	pub permissions: Vec<UserPermission>,
	pub age_restriction: Option<AgeRestriction>,
	#[serde(default)]
	pub max_sessions_allowed: Option<i32>,
}

#[utoipa::path(
	post,
	path = "/api/v1/users",
	tag = "user",
	request_body = CreateUser,
	responses(
		(status = 200, description = "Successfully created user", body = User),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 500, description = "Internal server error"),
	)
)]
/// Creates a new user.
async fn create_user(
	Extension(req): Extension<AuthContext>,
	State(ctx): State<AppState>,
	Json(input): Json<CreateUser>,
) -> APIResult<Json<User>> {
	req.enforce_permissions(&[UserPermission::ManageUsers])?;

	let db = &ctx.db;

	let hashed_password = bcrypt::hash(input.password, ctx.config.password_hash_cost)?;

	// TODO: https://github.com/Brendonovich/prisma-client-rust/issues/44
	let created_user = db
		._transaction()
		.run(|client| async move {
			let permissions = input
				.permissions
				.into_iter()
				.map(|p| p.to_string().trim().to_owned())
				.filter(|p| !p.is_empty())
				.collect::<Vec<String>>();

			let created_user = client
				.user()
				.create(
					input.username.clone(),
					hashed_password,
					chain_optional_iter(
						vec![
							user::is_server_owner::set(false),
							user::max_sessions_allowed::set(input.max_sessions_allowed),
						],
						[(!permissions.is_empty()).then(|| {
							user::permissions::set(Some(permissions.join(",")))
						})],
					),
				)
				.exec()
				.await?;
			tracing::trace!(?created_user, "Created user");

			if let Some(ar) = input.age_restriction {
				let _age_restriction = client
					.age_restriction()
					.create(
						ar.age,
						user::id::equals(created_user.id.clone()),
						vec![age_restriction::restrict_on_unset::set(
							ar.restrict_on_unset,
						)],
					)
					.exec()
					.await?;
				tracing::trace!(?_age_restriction, "Created age restriction");
			}

			let _user_preferences = client
				.user_preferences()
				.create(vec![
					user_preferences::user::connect(user::id::equals(
						created_user.id.clone(),
					)),
					user_preferences::user_id::set(Some(created_user.id.clone())),
				])
				.exec()
				.await?;
			tracing::trace!(?_user_preferences, "Created user preferences");

			client
				.user()
				.find_unique(user::id::equals(created_user.id))
				.with(user::user_preferences::fetch())
				.with(user::age_restriction::fetch())
				.exec()
				.await
		})
		.await?
		.ok_or(APIError::InternalServerError(
			"Failed to create user".to_string(),
		))?;
	tracing::trace!(final_user = ?created_user, "Final user result");

	Ok(Json(created_user.into()))
}

#[utoipa::path(
	put,
	path = "/api/v1/users/me",
	tag = "user",
	request_body = UpdateUser,
	responses(
		(status = 200, description = "Successfully updated user", body = User),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 500, description = "Internal server error"),
	)
)]
/// Updates the session user
async fn update_current_user(
	Extension(req): Extension<AuthContext>,
	session: Session,
	State(ctx): State<AppState>,
	Json(input): Json<UpdateUser>,
) -> APIResult<Json<User>> {
	let db = &ctx.db;
	let user = req.user();

	let updated_user = update_user(user, db, user.id.clone(), input, &ctx.config).await?;
	debug!(?updated_user, "Updated user");

	if get_session_user(&session).await?.is_some() {
		session
			.insert(SESSION_USER_KEY, updated_user.clone())
			.await?;
	}

	Ok(Json(updated_user))
}

#[derive(Debug, Clone, Deserialize, Type, ToSchema)]
pub struct UpdateUserPreferences {
	pub id: String,
	pub locale: String,
	pub preferred_layout_mode: String,
	pub primary_navigation_mode: String,
	pub layout_max_width_px: Option<i32>,
	pub app_theme: String,
	pub enable_gradients: bool,
	pub app_font: SupportedFont,
	pub show_query_indicator: bool,
	pub enable_live_refetch: bool,
	pub enable_discord_presence: bool,
	pub enable_compact_display: bool,
	pub enable_double_sidebar: bool,
	pub enable_replace_primary_sidebar: bool,
	pub enable_hide_scrollbar: bool,
	pub enable_job_overlay: bool,
	pub prefer_accent_color: bool,
	pub show_thumbnails_in_headers: bool,
}

#[utoipa::path(
	put,
	path = "/api/v1/users/me/preferences",
	tag = "user",
	request_body = UpdateUserPreferences,
	responses(
		(status = 200, description = "Successfully updated user preferences", body = UserPreferences),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 500, description = "Internal server error"),
	)
)]
/// Updates a user's preferences.
async fn update_current_user_preferences(
	Extension(req): Extension<AuthContext>,
	session: Session,
	State(ctx): State<AppState>,
	Json(input): Json<UpdateUserPreferences>,
) -> APIResult<Json<UserPreferences>> {
	let db = &ctx.db;

	let user = req.user();
	let user_preferences = user.user_preferences.clone().unwrap_or_default();

	trace!(user_id = ?user.id, ?user_preferences, updates = ?input, "Updating viewer's preferences");

	let updated_preferences = update_preferences(db, user_preferences.id, input).await?;
	debug!(?updated_preferences, "Updated user preferences");

	if get_session_user(&session).await?.is_some() {
		session
			.insert(
				SESSION_USER_KEY,
				User {
					user_preferences: Some(updated_preferences.clone()),
					..user.clone()
				},
			)
			.await?;
	}

	Ok(Json(updated_preferences))
}

#[utoipa::path(
	get,
	path = "/api/v1/users/me/navigation-arrangement",
	tag = "user",
	responses(
		(status = 200, description = "Successfully fetched user navigation arrangement"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "User preferences not found"),
		(status = 500, description = "Internal server error"),
	)
)]
async fn get_navigation_arrangement(
	Extension(req): Extension<AuthContext>,
	State(ctx): State<AppState>,
) -> APIResult<Json<Arrangement<NavigationItem>>> {
	let user = req.user();
	let db = &ctx.db;

	let user_preferences = db
		.user_preferences()
		.find_first(vec![user_preferences::user::is(vec![user::id::equals(
			user.id.clone(),
		)])])
		.exec()
		.await?
		.ok_or(APIError::NotFound(format!(
			"User preferences for {} not found",
			user.username
		)))?;
	let user_preferences = UserPreferences::from(user_preferences);

	Ok(Json(user_preferences.navigation_arrangement))
}

#[utoipa::path(
	put,
	path = "/api/v1/users/me/navigation-arrangement",
	tag = "user",
	request_body = Arrangement<NavigationItem>,
	responses(
		(status = 200, description = "Successfully updated user navigation arrangement", body = Arrangement<NavigationItem>),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "User preferences not found"),
		(status = 500, description = "Internal server error"),
	)
)]
async fn update_navigation_arrangement(
	Extension(req): Extension<AuthContext>,
	State(ctx): State<AppState>,
	Json(input): Json<Arrangement<NavigationItem>>,
) -> APIResult<Json<Arrangement<NavigationItem>>> {
	let user = req.user();
	let db = &ctx.db;

	let user_preferences = db
		.user_preferences()
		// TODO: Really old accounts potentially have users with preferences missing a `user_id`
		// assignment. This should be more properly fixed in the future, e.g. by a migration.
		.find_first(vec![user_preferences::user::is(vec![user::id::equals(
			user.id.clone(),
		)])])
		.exec()
		.await?
		.ok_or(APIError::NotFound(format!(
			"User preferences for {} not found",
			user.username
		)))?;
	let user_preferences = UserPreferences::from(user_preferences);

	let _updated_preferences = db
		.user_preferences()
		.update(
			user_preferences::id::equals(user_preferences.id.clone()),
			vec![user_preferences::navigation_arrangement::set(Some(
				serde_json::to_vec(&input).map_err(|e| {
					APIError::InternalServerError(format!(
						"Failed to serialize navigation arrangement: {e}"
					))
				})?,
			))],
		)
		.exec()
		.await?;

	Ok(Json(input))
}

#[derive(Deserialize, Type, ToSchema)]
pub struct DeleteUser {
	pub hard_delete: Option<bool>,
}

#[utoipa::path(
	delete,
	path = "/api/v1/users/{id}",
	tag = "user",
	params(
		("id" = String, Path, description = "The user's id.", example = "1ab2c3d4")
	),
	responses(
		(status = 200, description = "Successfully deleted user", body = User),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "User not found"),
		(status = 500, description = "Internal server error"),
	)
)]
/// Deletes a user by ID.
async fn delete_user_by_id(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	Json(input): Json<DeleteUser>,
) -> APIResult<Json<User>> {
	let db = &ctx.db;
	let user = req.server_owner_user()?;

	if user.id == id {
		return Err(APIError::BadRequest(
			"You cannot delete your own account.".into(),
		));
	}

	let hard_delete = input.hard_delete.unwrap_or(false);

	let deleted_user = if hard_delete {
		db.user().delete(user::id::equals(id.clone())).exec().await
	} else {
		db.user()
			.update(
				user::id::equals(id.clone()),
				vec![user::deleted_at::set(Some(Utc::now().into()))],
			)
			.exec()
			.await
	}?;

	debug!(?deleted_user, "Deleted user");

	Ok(Json(User::from(deleted_user)))
}

#[utoipa::path(
	get,
	path = "/api/v1/users/{id}",
	tag = "user",
	params(
		("id" = String, Path, description = "The user's ID.", example = "1ab2c3d4")
	),
	responses(
		(status = 200, description = "Successfully fetched user", body = User),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "User not found"),
		(status = 500, description = "Internal server error"),
	)
)]
/// Gets a user by ID.
async fn get_user_by_id(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<User>> {
	req.enforce_server_owner()?;
	let db = &ctx.db;
	let fetched_user = db
		.user()
		.find_unique(user::id::equals(id.clone()))
		.with(user::age_restriction::fetch())
		.exec()
		.await?
		.ok_or(APIError::NotFound(format!("User with id {id} not found")))?;

	Ok(Json(User::from(fetched_user)))
}

// TODO: pagination!
#[utoipa::path(
	get,
	path = "/api/v1/users/{id}/login-activity",
	tag = "user",
	params(
		("id" = String, Path, description = "The user's ID.", example = "1ab2c3d4")
	),
	responses(
		(status = 200, description = "Successfully fetched user", body = Vec<LoginActivity>),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "User not found"),
		(status = 500, description = "Internal server error"),
	)
)]
async fn get_user_login_activity_by_id(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<Vec<LoginActivity>>> {
	let user = req.user();

	let client = &ctx.db;

	if user.id != id && !user.is_server_owner {
		return Err(APIError::Forbidden(String::from(
			"You cannot access this resource",
		)));
	}

	let user_activity = client
		.user_login_activity()
		.find_many(vec![user_login_activity::user_id::equals(id)])
		.order_by(user_login_activity::timestamp::order(Direction::Desc))
		.exec()
		.await?;

	Ok(Json(
		user_activity.into_iter().map(LoginActivity::from).collect(),
	))
}

#[utoipa::path(
	put,
	path = "/api/v1/users/{id}",
	tag = "user",
	params(
		("id" = String, Path, description = "The user's ID.", example = "1ab2c3d4")
	),
	request_body = UpdateUser,
	responses(
		(status = 200, description = "Successfully updated user", body = User),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 500, description = "Internal server error"),
	)
)]
/// Updates a user by ID.
async fn update_user_handler(
	Extension(req): Extension<AuthContext>,
	session: Session,
	State(ctx): State<AppState>,
	Path(id): Path<String>,
	Json(input): Json<UpdateUser>,
) -> APIResult<Json<User>> {
	let db = &ctx.db;
	let user = req.user();

	if user.id != id && !user.is_server_owner {
		return Err(APIError::forbidden_discreet());
	}

	let updated_user = update_user(user, db, id.clone(), input, &ctx.config).await?;
	debug!(?updated_user, "Updated user");

	if user.id == id && get_session_user(&session).await?.is_some() {
		session
			.insert(SESSION_USER_KEY, updated_user.clone())
			.await?;
	} else {
		// When a server owner updates another user, we need to delete all sessions for that user
		// because the user's permissions may have changed. This is a bit lazy but it works.
		db.session()
			.delete_many(vec![session::user_id::equals(id)])
			.exec()
			.await?;
	}

	Ok(Json(updated_user))
}

#[utoipa::path(
	delete,
	path = "/api/v1/users/{id}/sessions",
	tag = "user",
	params(
		("id" = String, Path, description = "The user's ID.", example = "1ab2c3d4")
	),
	responses(
		(status = 200, description = "Successfully deleted user sessions"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 500, description = "Internal server error"),
	)
)]
async fn delete_user_sessions(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<()> {
	req.enforce_server_owner()?;

	let client = &ctx.db;
	let removed_sessions = client
		.session()
		.delete_many(vec![session::user_id::equals(id)])
		.exec()
		.await?;
	tracing::trace!(?removed_sessions, "Removed sessions for user");

	Ok(())
}

#[derive(Deserialize, ToSchema)]
pub struct UpdateAccountLock {
	lock: bool,
}

#[utoipa::path(
	put,
	path = "/api/v1/users/{id}/lock",
	tag = "user",
	params(
		("id" = String, Path, description = "The user's ID.", example = "1ab2c3d4")
	),
	request_body = UpdateAccountLock,
	responses(
		(status = 200, description = "Successfully updated user lock status", body = User),
		(status = 400, description = "You cannot lock your own account"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 500, description = "Internal server error"),
	)
)]
async fn update_user_lock_status(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	Json(input): Json<UpdateAccountLock>,
) -> APIResult<Json<User>> {
	let user = req.server_owner_user()?;
	if user.id == id {
		return Err(APIError::BadRequest(
			"You cannot lock your own account.".into(),
		));
	}

	let db = &ctx.db;
	let updated_user = db
		.user()
		.update(
			user::id::equals(id.clone()),
			vec![user::is_locked::set(input.lock)],
		)
		.exec()
		.await?;

	if input.lock {
		// Delete all sessions for this user if they are being locked
		let removed_sessions = db
			.session()
			.delete_many(vec![session::user_id::equals(id)])
			.exec()
			.await?;
		tracing::trace!(?removed_sessions, "Removed sessions for locked user");
	}

	Ok(Json(User::from(updated_user)))
}

#[utoipa::path(
	get,
	path = "/api/v1/users/{id}/preferences",
	tag = "user",
	params(
		("id" = String, Path, description = "The user's ID.", example = "1ab2c3d4")
	),
	responses(
		(status = 200, description = "Successfully fetched user preferences", body = UserPreferences),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "User preferences not found"),
		(status = 500, description = "Internal server error"),
	)
)]
/// Gets the user's preferences.
async fn get_user_preferences(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<UserPreferences>> {
	let db = &ctx.db;
	let user = req.user();

	if id != user.id {
		return Err(APIError::forbidden_discreet());
	}

	let user_preferences = db
		.user_preferences()
		.find_unique(user_preferences::user_id::equals(id.clone()))
		.exec()
		.await?;
	debug!(id, ?user_preferences, "Fetched user preferences");

	if user_preferences.is_none() {
		return Err(APIError::NotFound(format!(
			"User preferences with id {id} not found"
		)));
	}

	Ok(Json(UserPreferences::from(user_preferences.unwrap())))
}

// TODO: this is now a duplicate, do I need it? I think to remain RESTful, yes...
#[utoipa::path(
	put,
	path = "/api/v1/users/{id}/preferences",
	tag = "user",
	params(
		("id" = String, Path, description = "The user's ID.", example = "1ab2c3d4")
	),
	request_body = UpdateUserPreferences,
	responses(
		(status = 200, description = "Successfully updated user preferences", body = UserPreferences),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 500, description = "Internal server error"),
	)
)]
/// Updates a user's preferences.
async fn update_user_preferences(
	Extension(req): Extension<AuthContext>,
	session: Session,
	State(ctx): State<AppState>,
	Path(id): Path<String>,
	Json(input): Json<UpdateUserPreferences>,
) -> APIResult<Json<UserPreferences>> {
	trace!(?id, ?input, "Updating user preferences");
	let db = &ctx.db;

	let user = req.user();
	let user_preferences = user.user_preferences.clone().unwrap_or_default();

	if user_preferences.id != input.id {
		return Err(APIError::forbidden_discreet());
	}

	let updated_preferences = update_preferences(db, user_preferences.id, input).await?;
	debug!(?updated_preferences, "Updated user preferences");

	if get_session_user(&session).await?.is_some() {
		session
			.insert(
				SESSION_USER_KEY,
				User {
					user_preferences: Some(updated_preferences.clone()),
					..user.clone()
				},
			)
			.await?;
	}

	Ok(Json(updated_preferences))
}

#[utoipa::path(
	get,
	path = "/api/v1/users/{id}/avatar",
	tag = "user",
	params(
		("id" = String, Path, description = "The user's ID.", example = "1ab2c3d4"),
	),
	responses(
		(status = 200, description = "Successfully fetched user avatar"),
		(status = 401, description = "Unauthorized"),
		(status = 404, description = "User avatar not found"),
		(status = 500, description = "Internal server error"),
	)
)]
async fn get_user_avatar(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
) -> APIResult<ImageResponse> {
	let client = &ctx.db;

	let user = client
		.user()
		.find_unique(user::id::equals(id))
		.exec()
		.await?
		.ok_or(APIError::NotFound("User not found".to_string()))?;

	match user.avatar_url {
		Some(url) if url.starts_with("/api/v1/") => {
			let avatars_dir = ctx.config.get_avatars_dir();
			let base_path = avatars_dir.join(user.username.as_str());
			if let Some(local_file) = get_unknown_image(base_path) {
				let FileParts { extension, .. } = local_file.file_parts();
				let content_type = ContentType::from_extension(extension.as_str());
				let bytes = fs::read(local_file).await?;
				Ok(ImageResponse::new(content_type, bytes))
			} else {
				Err(APIError::NotFound("User avatar not found".to_string()))
			}
		},
		Some(url) => {
			let bytes = reqwest::get(&url).await?.bytes().await?;
			let mut magic_bytes = [0; 5];
			magic_bytes.copy_from_slice(&bytes[0..5]);
			let content_type = ContentType::from_bytes(&magic_bytes);
			Ok(ImageResponse::new(content_type, bytes.to_vec()))
		},
		None => Err(APIError::NotFound("User avatar not found".to_string())),
	}
}

#[utoipa::path(
	post,
	path = "/api/v1/users/{id}/avatar",
	tag = "user",
	params(
		("id" = String, Path, description = "The user's ID.", example = "1ab2c3d4")
	),
	responses(
		(status = 200, description = "Successfully uploaded user avatar", body = User),
		(status = 400, description = "Invalid request"),
		(status = 401, description = "Unauthorized"),
		(status = 404, description = "User not found"),
		(status = 500, description = "Internal server error"),
	)
)]
async fn upload_user_avatar(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	mut upload: Multipart,
) -> APIResult<ImageResponse> {
	let by_user = req.user_and_enforce_permissions(&[UserPermission::UploadFile])?;
	let client = &ctx.db;

	if by_user.id != id && !by_user.is_server_owner {
		return Err(APIError::forbidden_discreet());
	}

	tracing::trace!(?id, ?upload, "Replacing user avatar");

	let user = client
		.user()
		.find_unique(user::id::equals(id.clone()))
		.exec()
		.await?
		.ok_or(APIError::NotFound("User not found".to_string()))?;

	let upload_data =
		validate_and_load_image(&mut upload, Some(ctx.config.max_image_upload_size))
			.await?;

	let ext = upload_data.content_type.extension();
	let username = user.username.clone();

	let base_path = ctx.config.get_avatars_dir().join(username.as_str());
	let existing_avatar = get_unknown_image(base_path.clone());
	if let Some(existing_avatar) = existing_avatar {
		std::fs::remove_file(existing_avatar)?;
	}

	let file_name = format!("{username}.{ext}");
	let file_path = ctx.config.get_avatars_dir().join(file_name.as_str());
	let mut file = File::create(file_path.clone())?;
	file.write_all(&upload_data.bytes)?;

	let updated_user = client
		.user()
		.update(
			user::id::equals(id.clone()),
			vec![user::avatar_url::set(Some(format!(
				"/api/v1/users/{id}/avatar"
			)))],
		)
		.exec()
		.await?;

	tracing::trace!(?updated_user, "Updated user");

	Ok(ImageResponse::new(
		upload_data.content_type,
		upload_data.bytes,
	))
}
