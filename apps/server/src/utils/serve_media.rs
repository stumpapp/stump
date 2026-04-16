//! Utilities for serving media files, thumbnails, etc.

use axum::{
	body::Body,
	extract::Request,
	http::{header, HeaderMap},
	response::IntoResponse,
};
use graphql::data::AuthContext;
use models::{
	entity::media::{self},
	shared::enums::UserPermission,
};
use tower_http::services::ServeFile;

use sea_orm::prelude::*;

use crate::errors::{APIError, APIResult};

/// Looks up a piece of media in the database, checks that the user has permission to
/// download it, and serves the media file to the client.
pub async fn serve_media_file(
	req: AuthContext,
	headers: HeaderMap,
	conn: &DatabaseConnection,
	media_id: String,
) -> APIResult<impl IntoResponse> {
	let user = req
		.user_and_enforce_permissions(&[UserPermission::DownloadFile])
		.map_err(|_| {
			tracing::error!("User does not have permission to download file");
			APIError::forbidden_discreet()
		})?;

	let book = media::Entity::find_for_user(&user)
		.filter(media::Column::Id.eq(media_id))
		.into_model::<media::MediaIdentSelect>()
		.one(conn)
		.await?
		.ok_or(APIError::NotFound("Book not found".to_string()))?;

	// Note: I am reusing the original headers to support range requests
	let mut serve_req = Request::new(Body::empty());
	*serve_req.headers_mut() = headers;

	match ServeFile::new(&book.path).try_call(serve_req).await {
		Ok(mut response) => {
			if let Some(filename) = std::path::Path::new(&book.path)
				.file_name()
				.and_then(|os_str| os_str.to_str())
			{
				response.headers_mut().insert(
					header::CONTENT_DISPOSITION,
					format!("attachment; filename=\"{}\"", filename)
						.parse()
						.unwrap_or_else(|_| "attachment".parse().unwrap()),
				);
			}
			Ok(response)
		},
		Err(e) => {
			tracing::error!(error = ?e, path = %book.path, "Error serving media file");
			Err(APIError::InternalServerError(format!(
				"Failed to serve file: {}",
				e
			)))
		},
	}
}
