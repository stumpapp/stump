use axum::{extract::State, middleware, routing::get, Extension, Json, Router};
use serde::{Deserialize, Serialize};
use specta::Type;
use stump_core::{
	config::StumpConfig,
	db::entity::{metadata_source::MetadataSourceEntry, UserPermission},
	prisma::metadata_source,
};

use crate::{
	config::state::AppState,
	errors::APIResult,
	middleware::auth::{auth_middleware, RequestContext},
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.route("/config", get(get_server_config))
		.route("/config/upload", get(get_upload_config))
		.route(
			"/config/metadata_sources",
			get(get_metadata_sources).put(update_metadata_source),
		)
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
}

#[utoipa::path(
	get,
	path = "/api/v1/config",
	tag = "config",
	responses(
		(status = 200, description = "Successfully retrieved server config"),
		(status = 401, description = "Unauthorized"),
		(status = 500, description = "Internal server error")
	)
)]
async fn get_server_config(
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<Json<StumpConfig>> {
	req.enforce_permissions(&[UserPermission::ManageServer])?;

	Ok(Json(StumpConfig::clone(&ctx.config)))
}

#[derive(Debug, Deserialize, Serialize, Type)]
pub struct UploadConfig {
	enabled: bool,
	max_file_upload_size: usize,
}

#[utoipa::path(
	get,
	path = "/api/v1/config/upload",
	tag = "config",
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
		enabled: ctx.config.enable_upload,
		max_file_upload_size: ctx.config.max_file_upload_size,
	}))
}

async fn get_metadata_sources(
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<Json<Vec<MetadataSourceEntry>>> {
	// TODO - Correct permissions?
	req.enforce_permissions(&[UserPermission::ManageServer])?;

	Ok(Json(
		ctx.db
			.metadata_source()
			.find_many(vec![])
			.exec()
			.await?
			.into_iter()
			.map(MetadataSourceEntry::from)
			.collect(),
	))
}

async fn update_metadata_source(
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
	Json(source): Json<MetadataSourceEntry>,
) -> APIResult<()> {
	// TODO - Correct permissions?
	req.enforce_permissions(&[UserPermission::ManageServer])?;

	// This should fail if the source isn't one of the ones already present in the database.
	// Other logic is responsible for initial population of sources.
	let _ = ctx
		.db
		.metadata_source()
		.update(
			metadata_source::id::equals(source.id.clone()),
			vec![metadata_source::enabled::set(source.enabled)],
		)
		.exec()
		.await?;

	Ok(())
}
