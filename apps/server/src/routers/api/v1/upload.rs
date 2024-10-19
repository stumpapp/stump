use std::{fs, path::PathBuf};

use axum::{
	extract::{Multipart, Path, State},
	middleware,
	routing::post,
	Extension, Json, Router,
};
use stump_core::{db::entity::UserPermission, prisma::library};

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	middleware::auth::{auth_middleware, RequestContext},
	routers::api::filters::library_not_hidden_from_user_filter,
	utils::validate_and_load_file_upload,
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.nest(
			"/upload",
			Router::new().route("/libraries/:id", post(upload_to_library)),
		)
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
}

#[utoipa::path(
	post,
	path = "/api/v1/upload/libraries/:id",
	tag = "library",
	params(
		("id" = String, Path, description = "The library ID"),
	),
	responses(
		(status = 200, description = "Successfully uploaded file"),
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
	tracing::warn!("Inside upload_to_library");

	let user = req.user_and_enforce_permissions(&[
		UserPermission::UploadFile,
		UserPermission::ManageLibrary,
	])?;
	let client = &ctx.db;

	let library = client
		.library()
		.find_first(vec![
			library::id::equals(id),
			library_not_hidden_from_user_filter(&user),
		])
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Library not found")))?;

	let upload_data =
		validate_and_load_file_upload(&mut upload, Some(ctx.config.max_file_upload_size))
			.await?;

	place_library_file(&upload_data.name, upload_data.bytes, library)?;
	Ok(Json("It worked".to_string()))
}

fn place_library_file(
	name: &str,
	content: Vec<u8>,
	library: library::Data,
) -> APIResult<()> {
	let lib_path = &library.path;
	let file_path = PathBuf::from(format!("{lib_path}/{name}"));

	fs::write(file_path, content)?;

	Ok(())
}
