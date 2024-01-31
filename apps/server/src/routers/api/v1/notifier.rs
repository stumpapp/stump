use axum::{
	extract::{Path, State},
	routing::get,
	Json, Router,
};
use serde::Deserialize;
use specta::Type;
use stump_core::db::entity::{notifier, Notifier, NotifierConfig, NotifierType};
use tower_sessions::Session;
use utoipa::ToSchema;

use crate::{
	config::state::AppState,
	errors::{ApiError, ApiResult},
	utils::{chain_optional_iter, get_session_server_owner_user},
};

// "/" -> GET is get all, POST is create
// "/:id" -> GET is get, PUT is update, PATCH is patch, DELETE is delete
pub(crate) fn mount() -> Router<AppState> {
	Router::new().nest(
		"/notifiers",
		Router::new()
			.route("/", get(get_notifiers).post(create_notifier)) // <-- ONE CHANGE HERE
			.nest(
				"/:id",
				Router::new().route(
					"/",
					get(get_notifier_by_id)
						.put(update_notifier)
						.patch(patch_notifier)
						.delete(delete_notifier),
				),
			),
	)
}

async fn get_notifiers(
	State(ctx): State<AppState>,
	session: Session,
) -> ApiResult<Json<Vec<Notifier>>> {
	let client = ctx.get_db();
	get_session_server_owner_user(&session)?;

	let notifiers = client.notifier().find_many(vec![]).exec().await?;

	Ok(Json(notifiers.into_iter().map(Notifier::from).collect()))
}

// take ID as param
async fn get_notifier_by_id(
	State(ctx): State<AppState>,
	Path(id): Path<String>,
	session: Session,
) -> ApiResult<Json<Notifier>> {
	let client = ctx.get_db();

	let i32id = id.parse::<i32>().unwrap();

	let where_params = vec![stump_core::prisma::notifier::id::equals(i32id)];

	let notifier = client
		.notifier()
		.find_first(where_params)
		.exec()
		.await?
		.ok_or(ApiError::NotFound("Notifier not found".to_string()));

	Ok(Json(Notifier::from(notifier.unwrap())))
}

// take create/update struct

#[derive(Deserialize, ToSchema, Type)]
pub struct CreateOrUpdateNotifier {
	#[serde(rename = "type")]
	_type: NotifierType,
	config: NotifierConfig,
}

async fn create_notifier(
	State(ctx): State<AppState>,
	session: Session,
	Json(payload): Json<CreateOrUpdateNotifier>,
) -> ApiResult<Json<Notifier>> {
	get_session_server_owner_user(&session)?;

	let client = ctx.get_db();

	let notifier = client
		.notifier()
		.create(
			payload._type.to_string(),
			payload.config.into_bytes(),
			vec![],
		)
		.exec()
		.await?;

	Ok(Json(Notifier::from(notifier)))
}

// take ID as param
// take create/update struct
// full replace/update
async fn update_notifier() {
	// setup:
	// - add id to handler (the fn) in path using Path extractor
	// - add State to handler (the fn) use State extractor
	// - add session to handler (the fn)
	// - add CreateOrUpdateNotifier to handler (the fn) using Json extractor

	// step 1: enforce server admin session
	// step 2: get client from context (state)
	// step 3: write the update query: https://prisma.brendonovich.dev/writing-data/update
}

#[derive(Deserialize, ToSchema, Type)]
pub struct PatchNotifier {
	#[serde(rename = "type")]
	_type: Option<NotifierType>,
	config: Option<NotifierConfig>,
}

// take ID as param
// take patch struct
// only update what is not None
async fn patch_notifier(
	State(ctx): State<AppState>,
	Path(id): Path<String>,
	session: Session,
	Json(payload): Json<CreateOrUpdateNotifier>,
) -> ApiResult<Json<Notifier>> {
	let client = ctx.get_db();

	let i32id = id.parse::<i32>().unwrap();

	let updated_notifier = client
		.notifier()
		.update(
			stump_core::prisma::notifier::id::equals(i32id),
			chain_optional_iter(
				stump_core::prisma::notifier::r#type::set(payload._type.to_string()),
				optional,
			),
		)
		.exec()
		.await?;
	// chain_optional_iter([], [
	// 	payload._type.and_then()
	// ])
	Ok(Json(Notifier::from(updated_notifier)))
}

// take ID
async fn delete_notifier() {}
