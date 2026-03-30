use axum::{
	extract::{Path, State},
	middleware,
	routing::get,
	Router,
};
use models::entity::user;
use sea_orm::{prelude::*, ColumnTrait, QuerySelect};
use stump_core::filesystem::ContentType;

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	middleware::auth::auth_middleware,
	utils::http::ImageResponse,
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.route("/users/{id}/avatar", get(get_user_avatar_handler))
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
}

/// Serve a user's avatar image by their ID
async fn get_user_avatar_handler(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
) -> APIResult<ImageResponse> {
	let avatar_path: Option<String> = user::Entity::find()
		.select_only()
		.column(user::Column::AvatarPath)
		.filter(user::Column::Id.eq(&id))
		.into_tuple()
		.one(ctx.conn.as_ref())
		.await?
		.ok_or_else(|| APIError::NotFound(format!("User with ID '{}' not found", id)))?;

	let Some(avatar_path) = avatar_path else {
		return Err(APIError::NotFound(format!(
			"User with ID '{}' does not have an avatar",
			id
		)));
	};

	let path = std::path::Path::new(&avatar_path);

	let data = tokio::fs::read(path).await.map_err(|e| {
		tracing::error!(?e, ?avatar_path, "Failed to read user avatar file");
		APIError::InternalServerError("Failed to read avatar from disk".to_string())
	})?;

	let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("jpg");
	let content_type = ContentType::from_extension(ext);

	Ok(ImageResponse::new(content_type, data))
}
