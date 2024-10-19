use std::path::PathBuf;

use axum::{
	body::Bytes,
	extract::{multipart::Field, Multipart, Path, State},
	middleware,
	routing::{get, post},
	Extension, Json, Router,
};
use axum_typed_multipart::{FieldData, TryFromField, TryFromMultipart, TypedMultipart};
use serde::{Deserialize, Serialize};
use specta::Type;
use stump_core::{
	db::entity::{macros::library_path_with_options_select, UserPermission},
	prisma::library,
};
use tokio::fs;

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	middleware::auth::{auth_middleware, RequestContext},
	routers::api::filters::library_not_hidden_from_user_filter,
	utils::validate_and_load_file_upload,
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.route("/config", get(get_upload_config))
		.nest(
			"/upload",
			Router::new().route("/libraries/:id", post(upload_to_library)),
		)
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
}

#[derive(Debug, Deserialize, Serialize, Type)]
pub struct UploadConfig {
	max_file_upload_size: usize,
}

#[utoipa::path(
	get,
	path = "/api/v1/upload/config",
	tag = "upload",
	responses(
		(status = 200, description = "Successfully retrieved upload config"),
		(status = 401, description = "Unauthorized"),
		(status = 500, description = "Internal server error")
	)
)]
async fn get_upload_config(
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<Json<UploadConfig>> {
	req.enforce_permissions(&[UserPermission::UploadFile])?;

	Ok(Json(UploadConfig {
		max_file_upload_size: ctx.config.max_file_upload_size,
	}))
}

#[derive(Debug, Deserialize, Serialize, Type, TryFromField)]
pub enum UploadStrategy {
	#[serde(rename = "books")]
	Books,
	#[serde(rename = "series")]
	Series,
}

// https://docs.rs/axum_typed_multipart/0.13.1/axum_typed_multipart/
#[derive(TryFromMultipart)]
struct UploadRequest {
	strategy: UploadStrategy,
	/// The path to place the files at. If not provided, the library path is used. If the
	/// path does not exist, or exists outside the library path, the request will fail.
	#[form_data(default)]
	place_at: Option<String>, // PathBuf
	files: Vec<FieldData<Bytes>>,
}

async fn testing_ground_upload(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
	TypedMultipart(UploadRequest {
		strategy,
		place_at,
		files,
	}): TypedMultipart<UploadRequest>,
) -> APIResult<Json<()>> {
	let user = req.user_and_enforce_permissions(&[
		UserPermission::UploadFile,
		UserPermission::ManageLibrary,
	])?;
	let client = &ctx.db;

	// The form data is going to be loosely constructed by the js:
	// const formData = new FormData();
	// formData.append("files", files); // files is a File[]
	// formData.append("strategy", strategy); // strategy is a string
	// formData.append("place_at", place_at); // place_at is a Option<PathBuf>

	let library = client
		.library()
		.find_first(vec![
			library::id::equals(id),
			library_not_hidden_from_user_filter(&user),
		])
		.select(library_path_with_options_select::select())
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Library not found")))?;

	let resolved_place_at = place_at.unwrap_or_else(|| library.path.clone());

	// check the path exists
	if fs::metadata(&resolved_place_at).await.is_err() {
		return Err(APIError::BadRequest(String::from(
			"The path does not exist",
		)));
	} else if !resolved_place_at.starts_with(&library.path) {
		return Err(APIError::BadRequest(String::from(
			"The path is outside the library",
		)));
	}

	let place_at = PathBuf::from(resolved_place_at);

	// TODO: handle the files

	// Note: keeping this scrap in case the typed multipart doesn't work out
	// let mut strategy: Option<UploadStrategy> = None;
	// let mut place_at: Option<PathBuf> = None;
	// let mut upload_fields = Vec::new();

	// while let Some(field) = upload.next_field().await? {
	// 	let name = field.name().unwrap_or_default();

	// 	match field.content_type() {
	// 		Some(mime) if name == "strategy" && mime == "text/plain" => {
	// 			let bytes = field.bytes().await?;
	// 			let strategy_str = std::str::from_utf8(bytes.as_ref()).map_err(|_| {
	// 				APIError::BadRequest(String::from("Invalid strategy"))
	// 			})?;
	// 			strategy = match strategy_str {
	// 				"books" => Some(UploadStrategy::Books),
	// 				"series" => Some(UploadStrategy::Series),
	// 				_ => None,
	// 			};
	// 		},
	// 		Some(mime) if name == "place_at" && mime == "text/plain" => {
	// 			let bytes = field.bytes().await?;
	// 			let place_at_str = std::str::from_utf8(bytes.as_ref()).map_err(|_| {
	// 				APIError::BadRequest(String::from("Invalid place_at"))
	// 			})?;
	// 			place_at = Some(PathBuf::from(place_at_str));
	// 		},
	// 		_ => {
	// 			upload_fields.push(field);
	// 		},
	// 	}
	// }

	Ok(Json(()))
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

	place_library_file(&upload_data.name, upload_data.bytes, library).await?;

	Ok(Json("It worked".to_string()))
}

async fn place_library_file(
	name: &str,
	content: Vec<u8>,
	library: library::Data,
) -> APIResult<()> {
	let lib_path = &library.path;
	let file_path = PathBuf::from(format!("{lib_path}/{name}"));

	fs::write(file_path, content).await?;

	Ok(())
}
