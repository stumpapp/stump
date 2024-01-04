use crate::{
	config::state::AppState,
	errors::{ApiError, ApiResult},
	filter::chain_optional_iter,
	utils::get_user_and_enforce_permission,
};
use axum::{
	extract::{Path, State},
	routing::get,
	Json, Router,
};
use prisma_client_rust::or;
use serde::{Deserialize, Serialize};
use serde_qs::axum::QsQuery;
use specta::Type;
use stump_core::{
	db::{
		entity::{macros::media_only_series_id, Media, SmartList, UserPermission},
		filter::{FilterGroup, FilterJoin, MediaSmartFilter, SmartFilter},
	},
	prisma::{library, series, smart_list, user},
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
				.route("/items", get(get_smart_list_items))
				.route("/meta", get(get_smart_list_meta)),
		)
}

#[derive(Deserialize, Debug, Type, ToSchema)]
pub struct GetSmartListsParams {
	#[serde(default)]
	all: Option<bool>,
	#[serde(default)]
	search: Option<String>,
}

async fn get_smart_lists(
	State(ctx): State<AppState>,
	session: Session,
	QsQuery(params): QsQuery<GetSmartListsParams>,
) -> ApiResult<Json<Vec<SmartList>>> {
	let user =
		get_user_and_enforce_permission(&session, UserPermission::AccessSmartList)?;
	let client = ctx.get_db();

	let query_all = params.all.unwrap_or(false);
	if query_all && !user.is_server_owner {
		return Err(ApiError::Forbidden(
			"You do not have permission to access this resource.".to_string(),
		));
	}

	let where_params = chain_optional_iter(
		[],
		// TODO: support shared smart lists
		[
			(!query_all).then(|| smart_list::creator_id::equals(user.id)),
			params.search.map(|search| {
				or![
					smart_list::name::contains(search.clone()),
					smart_list::description::contains(search),
				]
			}),
		],
	);

	let raw_lists = client.smart_list().find_many(where_params).exec().await?;

	let smart_lists = raw_lists
		.into_iter()
		.map(|smart_list| SmartList::try_from(smart_list))
		.collect::<Result<Vec<_>, _>>()?;

	Ok(Json(smart_lists))
}

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
	let user =
		get_user_and_enforce_permission(&session, UserPermission::AccessSmartList)?;
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
	let user =
		get_user_and_enforce_permission(&session, UserPermission::AccessSmartList)?;
	let client = ctx.get_db();

	let smart_list = client
		.smart_list()
		.find_first(vec![
			smart_list::id::equals(id),
			// TODO: support shared smart lists
			smart_list::creator_id::equals(user.id),
		])
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
	let user =
		get_user_and_enforce_permission(&session, UserPermission::AccessSmartList)?;
	let client = ctx.get_db();

	let smart_list = client
		.smart_list()
		.find_unique(smart_list::id::equals(id.clone()))
		.exec()
		.await?
		.ok_or_else(|| ApiError::NotFound("Smart list not found".to_string()))?;

	let deleted_count = client
		.smart_list()
		.delete_many(vec![
			smart_list::id::equals(id),
			smart_list::creator_id::equals(user.id),
		])
		.exec()
		.await?;

	if deleted_count == 0 {
		return Err(ApiError::NotFound("Smart list not found".to_string()));
	} else if deleted_count > 1 {
		tracing::warn!(
			?deleted_count,
			"Expected to delete one smart list, but deleted more than one!"
		);
	}

	Ok(Json(SmartList::try_from(smart_list)?))
}

async fn get_smart_list_items(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: Session,
) -> ApiResult<Json<Vec<Media>>> {
	let user =
		get_user_and_enforce_permission(&session, UserPermission::AccessSmartList)?;

	let client = ctx.get_db();

	let smart_list = client
		.smart_list()
		.find_first(vec![
			smart_list::id::equals(id.clone()),
			smart_list::creator_id::equals(user.id),
		])
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

#[derive(Serialize, Deserialize, Debug, Type, ToSchema)]
pub struct SmartListMeta {
	matched_books: i64,
	matched_series: i64,
	matched_libraries: i64,
}

async fn get_smart_list_meta(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: Session,
) -> ApiResult<Json<SmartListMeta>> {
	let user =
		get_user_and_enforce_permission(&session, UserPermission::AccessSmartList)?;
	let client = ctx.get_db();

	let smart_list = client
		.smart_list()
		.find_first(vec![
			smart_list::id::equals(id.clone()),
			smart_list::creator_id::equals(user.id),
		])
		.exec()
		.await?
		.ok_or_else(|| ApiError::NotFound("Smart list not found".to_string()))?;

	let smart_filter: SmartFilter<MediaSmartFilter> =
		serde_json::from_slice(&smart_list.filters).map_err(|e| {
			tracing::error!(?e, "Failed to deserialize smart list filters");
			ApiError::InternalServerError(e.to_string())
		})?;

	// TODO: consolidate this with get_smart_list_items OR implement some kind of into
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

	// TODO: would it just be more efficient to do three queries in this transaction?
	let meta = client
		._transaction()
		.run(|tx| async move {
			let books = tx
				.media()
				.find_many(params.clone())
				.select(media_only_series_id::select())
				.exec()
				.await?;

			let matched_books = books.len() as i64;

			let matched_series = books
				.into_iter()
				.filter_map(|mut book| book.series_id.take())
				.collect::<std::collections::HashSet<_>>();
			let matched_series_count = matched_series.len() as i64;

			tx.library()
				.count(vec![library::series::some(vec![series::id::in_vec(
					matched_series.into_iter().collect::<Vec<_>>(),
				)])])
				.exec()
				.await
				.map(|matched_libraries| SmartListMeta {
					matched_books,
					matched_series: matched_series_count,
					matched_libraries,
				})
		})
		.await?;

	Ok(Json(meta))
}
