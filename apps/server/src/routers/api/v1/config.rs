use axum::{
	extract::{Query, State},
	middleware,
	routing::get,
	Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use specta::Type;
use stump_core::{
	config::StumpConfig,
	db::entity::{MetadataSourceEntry, MetadataSourceSchema, UserPermission},
	prisma::metadata_sources,
};

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
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
		.route(
			"/config/metadata_sources/schema",
			get(get_metadata_source_schema),
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

#[utoipa::path(
	get,
	path = "/api/v1/config/metadata_sources",
	tag = "config",
	responses(
		(status = 200, description = "Successfully retrieved metadata sources for server"),
		(status = 401, description = "Unauthorized"),
		(status = 500, description = "Internal server error")
	)
)]
async fn get_metadata_sources(
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<Json<Vec<MetadataSourceEntry>>> {
	// TODO - Correct permissions?
	req.enforce_permissions(&[UserPermission::ManageServer])?;

	Ok(Json(
		ctx.db
			.metadata_sources()
			.find_many(vec![])
			.exec()
			.await?
			.into_iter()
			.map(MetadataSourceEntry::from)
			.collect(),
	))
}

#[derive(Debug, Deserialize)]
pub struct GetMetadataSourceSchemaParams {
	pub name: String,
}

#[utoipa::path(
	get,
	path = "/api/v1/config/metadata_sources/schema",
	tag = "config",
	responses(
		(status = 200, description = "Successfully retrieved metadata sources for server"),
		(status = 401, description = "Unauthorized"),
		(status = 500, description = "Internal server error")
	)
)]
async fn get_metadata_source_schema(
	State(ctx): State<AppState>,
	Query(params): Query<GetMetadataSourceSchemaParams>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<Json<Option<MetadataSourceSchema>>> {
	// TODO - Correct permissions?
	req.enforce_permissions(&[UserPermission::ManageServer])?;

	let source = ctx
		.db
		.metadata_sources()
		.find_first(vec![metadata_sources::name::equals(params.name.clone())])
		.exec()
		.await?
		.map(MetadataSourceEntry::from);

	if source.is_none() {
		return Err(crate::errors::APIError::NotFound(format!(
			"Source {} not found.",
			params.name
		)));
	}
	let source_config = source.unwrap().get_config_schema();

	Ok(Json(source_config))
}

#[utoipa::path(
	put,
	path = "/api/v1/config/metadata_sources",
	tag = "config",
	responses(
		(status = 200, description = "Successfully updated metadata source"),
		(status = 401, description = "Unauthorized"),
		(status = 500, description = "Internal server error")
	)
)]
async fn update_metadata_source(
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
	Json(source): Json<MetadataSourceEntry>,
) -> APIResult<()> {
	// TODO - Correct permissions?
	req.enforce_permissions(&[UserPermission::ManageServer])?;

	// Get the matching source from the DB, or return 404
	let db_source = ctx
		.db
		.metadata_sources()
		.find_unique(metadata_sources::name::equals(source.name.clone()))
		.exec()
		.await?
		.map(MetadataSourceEntry::from)
		.ok_or_else(|| {
			APIError::NotFound(format!("Could not find source with name {}", source.name))
		})?;

	let mut set_params = vec![metadata_sources::enabled::set(source.enabled)];
	if db_source.validate_config(source.config.as_ref()) {
		set_params.push(metadata_sources::config::set(source.config));
	} else {
		return Err(APIError::BadRequest(format!(
			"Invalid config: {:?}",
			source.config
		)));
	}

	// This should fail if the source isn't one of the ones already present in the database.
	// Other logic is responsible for initial population of sources.
	let _ = ctx
		.db
		.metadata_sources()
		.update(
			metadata_sources::name::equals(source.name.clone()),
			set_params,
		)
		.exec()
		.await?;

	Ok(())
}
