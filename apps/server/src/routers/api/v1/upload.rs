use axum::{
	extract::{Multipart, Path, State},
	routing::post,
	Extension, Json, Router,
};
use stump_core::{db::entity::UserPermission, prisma::library};

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	middleware::auth::RequestContext,
	routers::api::v1::library::library_not_hidden_from_user_filter,
	utils::validate_and_load_file_upload,
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new().nest(
		"/upload",
		Router::new().route("/libraries/:id", post(upload_to_library)),
	)
}

#[utoipa::path(
	get,
	path = "/api/v1/upload/libraries/:id/thumbnail",
	tag = "library",
	params(
		("id" = String, Path, description = "The library ID"),
	),
	responses(
		(status = 200, description = "Successfully retrieved library thumbnail"),
		(status = 401, description = "Unauthorized"),
		(status = 404, description = "Library not found"),
		(status = 500, description = "Internal server error")
	)
)]
async fn upload_to_library(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
	mut upload: Multipart,
) -> APIResult<Json<String>> {
	let user = req.user_and_enforce_permissions(&[
		UserPermission::UploadFile,
		UserPermission::ManageLibrary,
	])?;
	let client = &ctx.db;

	tracing::trace!(?id, ?upload, "Replacing library thumbnail");

	let library = client
		.library()
		.find_first(vec![
			library::id::equals(id),
			library_not_hidden_from_user_filter(&user),
		])
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Library not found")))?;

	let (content_type, bytes) = validate_and_load_file_upload(
		&mut upload,
		Some(ctx.config.max_image_upload_size),
	)
	.await?;

	let ext = content_type.extension();
	let library_id = library.id;

	Ok(Json("It worked".to_string()))
}
