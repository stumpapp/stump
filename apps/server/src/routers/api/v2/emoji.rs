use axum::{
	extract::{Path, State},
	middleware,
	routing::get,
	Router,
};
use models::entity::custom_emoji;
use sea_orm::{prelude::*, ColumnTrait};
use stump_core::filesystem::ContentType;

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	middleware::auth::auth_middleware,
	utils::http::ImageResponse,
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.route("/emojis/{emoji_code}", get(get_emoji_handler))
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
}

/// Serve a custom emoji by its name, e.g. :feelsbad:
async fn get_emoji_handler(
	Path(emoji_code): Path<String>,
	State(ctx): State<AppState>,
) -> APIResult<ImageResponse> {
	let emoji = custom_emoji::Entity::find()
		.filter(custom_emoji::Column::Name.eq(&emoji_code))
		.one(ctx.conn.as_ref())
		.await?
		.ok_or_else(|| {
			APIError::NotFound(format!("Custom emoji '{}' not found", emoji_code))
		})?;

	let emojis_dir = ctx.config.get_emojis_dir();
	let file_path = std::path::Path::new(&emojis_dir)
		.join(format!("{}.{}", emoji.id, emoji.file_extension));

	let data = tokio::fs::read(&file_path).await.map_err(|e| {
		tracing::error!(?e, ?file_path, "Failed to read emoji file");
		APIError::InternalServerError("Failed to read emoji file from disk".to_string())
	})?;

	let content_type = ContentType::from_extension(&emoji.file_extension);

	Ok(ImageResponse::new(content_type, data))
}
