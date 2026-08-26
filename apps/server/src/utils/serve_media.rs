//! Utilities for serving media files, thumbnails, etc.

use std::path::Path;

use axum::{
	body::Body,
	extract::Request,
	http::{header, HeaderMap},
	response::{IntoResponse, Response},
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
) -> APIResult<Response> {
	let book = find_downloadable_media(&req, conn, media_id).await?;
	let filename = Path::new(&book.path)
		.file_name()
		.and_then(|filename| filename.to_str());
	serve_file_path(headers, &book.path, filename).await
}

/// Looks up media visible to the user after enforcing download permission.
pub async fn find_downloadable_media(
	req: &AuthContext,
	conn: &DatabaseConnection,
	media_id: String,
) -> APIResult<media::Model> {
	let user = req
		.user_and_enforce_permissions(&[UserPermission::DownloadFile])
		.map_err(|_| {
			tracing::error!("User does not have permission to download file");
			APIError::forbidden_discreet()
		})?;

	media::Entity::find_for_user(&user)
		.filter(media::Column::Id.eq(media_id))
		.one(conn)
		.await?
		.ok_or(APIError::NotFound("Book not found".to_string()))
}

/// Serves an authorized path while preserving request headers for range support.
pub async fn serve_file_path(
	headers: HeaderMap,
	path: impl AsRef<Path>,
	filename: Option<&str>,
) -> APIResult<Response> {
	let path = path.as_ref().to_path_buf();

	// Note: I am reusing the original headers to support range requests
	let mut serve_req = Request::new(Body::empty());
	*serve_req.headers_mut() = headers;

	match ServeFile::new(&path).try_call(serve_req).await {
		Ok(mut response) => {
			if let Some(filename) = filename {
				response.headers_mut().insert(
					header::CONTENT_DISPOSITION,
					format!("attachment; filename=\"{}\"", filename)
						.parse()
						.unwrap_or_else(|_| "attachment".parse().unwrap()),
				);
			}
			Ok(response.into_response())
		},
		Err(e) => {
			tracing::error!(error = ?e, path = %path.display(), "Error serving media file");
			Err(APIError::InternalServerError(format!(
				"Failed to serve file: {}",
				e
			)))
		},
	}
}
