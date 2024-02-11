use axum::{
	extract::{Path, State},
	middleware::from_extractor_with_state,
	routing::get,
	Json, Router,
};
use serde::Deserialize;
use specta::Type;
use stump_core::{
	db::entity::{Notifier, NotifierConfig, NotifierType, UserPermission},
	prisma::notifier,
};
use tower_sessions::Session;
use utoipa::ToSchema;

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	filter::chain_optional_iter,
	middleware::auth::Auth,
	utils::enforce_session_permissions,
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.nest(
			"/notifiers",
			Router::new()
				.route("/", get(get_notifiers).post(create_notifier))
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
		.layer(from_extractor_with_state::<Auth, AppState>(app_state))
}

#[utoipa::path(
	get,
	path = "/api/v1/notifiers",
	tag = "notifier",
	responses(
		(status = 200, description = "Successfully retrieved notifiers", body = Vec<Notifier>),
		(status = 401, description = "Unauthorized"),
		(status = 404, description = "Bad request"),
		(status = 500, description = "Internal server error")
	)
)]
async fn get_notifiers(
	State(ctx): State<AppState>,
	session: Session,
) -> APIResult<Json<Vec<Notifier>>> {
	enforce_session_permissions(&session, &[UserPermission::ReadNotifier])?;
	let client = &ctx.db;

	let notifiers = client
		.notifier()
		.find_many(vec![])
		.exec()
		.await?
		.into_iter()
		.map(Notifier::try_from)
		.collect::<Vec<Result<Notifier, _>>>();
	let notifiers = notifiers.into_iter().collect::<Result<Vec<_>, _>>()?;

	Ok(Json(notifiers))
}

#[utoipa::path(
	get,
	path = "/api/v1/notifiers/:id",
	tag = "notifier",
	params(
		("id" = i32, Path, description = "The notifier ID")
	),
	responses(
		(status = 200, description = "Successfully retrieved notifier", body = Notifier),
		(status = 401, description = "Unauthorized"),
		(status = 404, description = "Notifier not found"),
		(status = 500, description = "Internal server error")
	)
)]
async fn get_notifier_by_id(
	State(ctx): State<AppState>,
	Path(id): Path<i32>,
	session: Session,
) -> APIResult<Json<Notifier>> {
	enforce_session_permissions(&session, &[UserPermission::ReadNotifier])?;
	let client = &ctx.db;

	let notifier = client
		.notifier()
		.find_first(vec![notifier::id::equals(id)])
		.exec()
		.await?
		.ok_or(APIError::NotFound("Notifier not found".to_string()))?;

	Ok(Json(Notifier::try_from(notifier)?))
}

#[derive(Deserialize, ToSchema, Type)]
pub struct CreateOrUpdateNotifier {
	#[serde(rename = "type")]
	_type: NotifierType,
	config: NotifierConfig,
}

#[utoipa::path(
	post,
	path = "/api/v1/notifiers",
	tag = "notifier",
	request_body = CreateOrUpdateNotifier,
	responses(
		(status = 200, description = "Successfully created notifier"),
		(status = 400, description = "Bad request"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 500, description = "Internal server error")
	)
)]
async fn create_notifier(
	State(ctx): State<AppState>,
	session: Session,
	Json(payload): Json<CreateOrUpdateNotifier>,
) -> APIResult<Json<Notifier>> {
	enforce_session_permissions(&session, &[UserPermission::CreateNotifier])?;

	let client = &ctx.db;

	let notifier = client
		.notifier()
		.create(
			payload._type.to_string(),
			payload.config.into_bytes()?,
			vec![],
		)
		.exec()
		.await?;

	Ok(Json(Notifier::try_from(notifier)?))
}

#[utoipa::path(
	put,
	path = "/api/v1/notifiers/:id",
	tag = "notifier",
	request_body = UpdateNotifier,
	params(
		("id" = i32, Path, description = "The id of the notifier to update")
	),
	responses(
		(status = 200, description = "Successfully updated notifier"),
		(status = 400, description = "Bad request"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Not found"),
		(status = 500, description = "Internal server error")
	)
)]
async fn update_notifier(
	State(ctx): State<AppState>,
	Path(id): Path<i32>,
	session: Session,
	Json(payload): Json<CreateOrUpdateNotifier>,
) -> APIResult<Json<Notifier>> {
	enforce_session_permissions(&session, &[UserPermission::ManageNotifier])?;

	let client = &ctx.db;
	let notifier = client
		.notifier()
		.update(
			notifier::id::equals(id),
			vec![
				notifier::r#type::set(payload._type.to_string()),
				notifier::config::set(payload.config.into_bytes()?),
			],
		)
		.exec()
		.await?;

	Ok(Json(Notifier::try_from(notifier)?))
}

#[derive(Deserialize, ToSchema, Type)]
pub struct PatchNotifier {
	#[serde(rename = "type")]
	_type: Option<NotifierType>,
	config: Option<NotifierConfig>,
}

#[utoipa::path(
    patch,
    path = "/api/v1/notifiers/:id/",
    tag = "notifier",
    params(
        ("id" = i32, Path, description = "The ID of the notifier")
    ),
    responses(
        (status = 200, description = "Successfully updated notifier"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 404, description = "Notifier not found"),
        (status = 500, description = "Internal server error"),
    )
)]
async fn patch_notifier(
	State(ctx): State<AppState>,
	Path(id): Path<i32>,
	session: Session,
	Json(payload): Json<PatchNotifier>,
) -> APIResult<Json<Notifier>> {
	enforce_session_permissions(&session, &[UserPermission::ManageNotifier])?;

	let client = &ctx.db;

	let config = payload
		.config
		.map(|config| config.into_bytes())
		.transpose()?;

	let patched_notifier = client
		.notifier()
		.update(
			notifier::id::equals(id),
			chain_optional_iter(
				[],
				[
					payload
						._type
						.map(|_type| notifier::r#type::set(_type.to_string())),
					config.map(notifier::config::set),
				],
			),
		)
		.exec()
		.await?;

	Ok(Json(Notifier::try_from(patched_notifier)?))
}

#[utoipa::path(
	delete,
	path = "/api/v1/notifiers/:id/",
	tag = "notifier",
	params(
		("id" = i32, Path, description = "The notifier ID"),
	),
	responses(
		(status = 200, description = "Successfully deleted notifier"),
		(status = 401, description = "Unauthorized"),
		(status = 404, description = "Notifier not found"),
		(status = 500, description = "Internal server error")
	)
)]
async fn delete_notifier(
	State(ctx): State<AppState>,
	Path(id): Path<i32>,
	session: Session,
) -> APIResult<Json<Notifier>> {
	enforce_session_permissions(&session, &[UserPermission::DeleteNotifier])?;

	let client = &ctx.db;

	let deleted_notifier = client
		.notifier()
		.delete(notifier::id::equals(id))
		.exec()
		.await?;

	Ok(Json(Notifier::try_from(deleted_notifier)?))
}
