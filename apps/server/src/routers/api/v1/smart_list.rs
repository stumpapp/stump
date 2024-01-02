use crate::{
	config::state::AppState,
	errors::{ApiError, ApiResult},
	utils::get_session_server_owner_user,
};
use axum::{
	extract::{Path, State},
	routing::get,
	Json, Router,
};
use serde::Deserialize;
use specta::Type;
use stump_core::{
	db::{
		entity::{Media, SmartList},
		filter::{FilterGroup, FilterJoin, MediaSmartFilter, SmartFilter},
	},
	prisma::{smart_list, user},
};
use tower_sessions::Session;
use utoipa::ToSchema;

pub(crate) fn mount() -> Router<AppState> {
	Router::new()
		.route("/smart-lists", get(get_smart_lists).post(create_smart_list))
		.nest(
			"/smart-lists/:id",
			Router::new()
				.route(
					"/",
					get(get_smart_list_by_id).delete(delete_smart_list_by_id),
				)
				.route("/items", get(get_smart_list_items)),
		)
}

async fn get_smart_lists() {}

#[derive(Deserialize, Debug, Type, ToSchema)]
pub struct CreateSmartList {
	pub name: String,
	pub description: Option<String>,
	pub filter: SmartFilter<MediaSmartFilter>,
	#[serde(default)]
	pub joiner: FilterJoin,
}

async fn create_smart_list(
	State(ctx): State<AppState>,
	session: Session,
	Json(input): Json<CreateSmartList>,
) -> ApiResult<Json<SmartList>> {
	// TODO: permission configuration
	let user = get_session_server_owner_user(&session)?;
	let client = ctx.get_db();

	let serialized_filter = serde_json::to_vec(&input.filter).map_err(|e| {
		tracing::error!(?e, "Failed to serialize smart list filters");
		ApiError::InternalServerError(e.to_string())
	})?;

	let smart_list = client
		.smart_list()
		.create(
			input.name,
			serialized_filter,
			user::id::equals(user.id),
			vec![
				smart_list::description::set(input.description),
				smart_list::joiner::set(input.joiner.to_string()),
			],
		)
		.exec()
		.await?;

	tracing::trace!(?smart_list, "Created smart list");

	Ok(Json(SmartList::try_from(smart_list)?))
}

async fn get_smart_list_by_id(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: Session,
) -> ApiResult<Json<SmartList>> {
	// TODO: permission configuration
	let _user = get_session_server_owner_user(&session)?;
	let client = ctx.get_db();

	let smart_list = client
		.smart_list()
		.find_unique(smart_list::id::equals(id))
		.exec()
		.await?
		.ok_or_else(|| ApiError::NotFound("Smart list not found".to_string()))?;

	Ok(Json(SmartList::try_from(smart_list)?))
}

async fn delete_smart_list_by_id(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: Session,
) -> ApiResult<Json<SmartList>> {
	// TODO: permission configuration
	let _user = get_session_server_owner_user(&session)?;
	let client = ctx.get_db();

	let smart_list = client
		.smart_list()
		.delete(smart_list::id::equals(id))
		.exec()
		.await?;

	Ok(Json(SmartList::try_from(smart_list)?))
}

async fn get_smart_list_items(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: Session,
) -> ApiResult<Json<Vec<Media>>> {
	// TODO: permission configuration
	let _user = get_session_server_owner_user(&session)?;
	let client = ctx.get_db();

	let smart_list = client
		.smart_list()
		.find_unique(smart_list::id::equals(id))
		.exec()
		.await?
		.ok_or_else(|| ApiError::NotFound("Smart list not found".to_string()))?;

	let smart_filter: SmartFilter<MediaSmartFilter> =
		serde_json::from_slice(&smart_list.filters).map_err(|e| {
			tracing::error!(?e, "Failed to deserialize smart list filters");
			ApiError::InternalServerError(e.to_string())
		})?;

	let where_params = smart_filter
		.groups
		.into_iter()
		.map(|filter_group| match filter_group {
			FilterGroup::Or { or } => prisma_client_rust::operator::or(
				or.into_iter().map(|f| f.into_params()).collect(),
			),
			FilterGroup::And { and } => prisma_client_rust::operator::and(
				and.into_iter().map(|f| f.into_params()).collect(),
			),
			FilterGroup::Not { not } => prisma_client_rust::operator::not(
				not.into_iter().map(|f| f.into_params()).collect(),
			),
		})
		.collect();

	let joiner = FilterJoin::from(smart_list.joiner.as_str());
	let params = match joiner {
		FilterJoin::And => where_params,
		FilterJoin::Or => vec![prisma_client_rust::operator::or(where_params)],
	};

	let items = client.media().find_many(params).exec().await?;

	Ok(Json(items.into_iter().map(Media::from).collect()))
}
