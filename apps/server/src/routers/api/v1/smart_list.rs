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
use prisma_client_rust::{and, or};
use serde::{Deserialize, Serialize};
use serde_qs::axum::QsQuery;
use specta::Type;
use stump_core::{
	db::{
		entity::{
			macros::media_only_series_id, SmartList, SmartListItemGrouping,
			SmartListItems, SmartListView, SmartListViewConfig, User, UserPermission,
		},
		filter::{FilterJoin, MediaSmartFilter, SmartFilter},
	},
	prisma::{
		library, series, smart_list, smart_list_access_rule, smart_list_view, user,
	},
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
				.route("/meta", get(get_smart_list_meta))
				// TODO: nest a router for updating access
				.route("/access-rules", get(get_smart_list_access_rules))
				.nest(
					"/views",
					Router::new()
						.route(
							"/",
							get(get_smart_list_views).post(create_smart_list_view),
						)
						.nest(
							"/:name",
							Router::new().route(
								"/",
								get(get_smart_list_view)
									.put(update_smart_list_view)
									.delete(delete_smart_list_view),
							),
						),
				),
		)
}

/// Generates a single where param that asserts the user has access to a smart list
pub(crate) fn smart_list_access_for_user(
	user: &User,
	minimum_role: i32,
) -> smart_list::WhereParam {
	let user_id = user.id.clone();
	// A common condition that asserts there is an entry for the user that has a role
	// greater than or equal to the minimum role:
	// 1 for reader, 2 for collaborator, 3 for co-creator
	let base_rule = smart_list::access_rules::some(vec![
		smart_list_access_rule::user_id::equals(user_id.clone()),
		smart_list_access_rule::role::gte(minimum_role),
	]);

	or![
		// creator always has access
		smart_list::creator_id::equals(user_id.clone()),
		// condition where visibility is PUBLIC:
		and![
			// TODO: make enum
			smart_list::visibility::equals("PUBLIC".to_string()),
			// This asserts the reader rule is present OR there is no rule for the user
			or![
				base_rule.clone(),
				smart_list::access_rules::none(vec![
					smart_list_access_rule::user_id::equals(user_id.clone())
				])
			]
		],
		// condition where visibility is SHARED:
		and![
			smart_list::visibility::equals("SHARED".to_string()),
			base_rule
		],
		// condition where visibility is PRIVATE:
		and![
			smart_list::visibility::equals("PRIVATE".to_string()),
			smart_list::creator_id::equals(user_id)
		]
	]
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
		[
			(!query_all).then(|| smart_list_access_for_user(&user, 1)),
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
		.map(SmartList::try_from)
		.collect::<Result<Vec<_>, _>>()?;

	Ok(Json(smart_lists))
}

#[derive(Deserialize, Debug, Type, ToSchema)]
pub struct CreateSmartList {
	pub name: String,
	pub description: Option<String>,
	pub filter: SmartFilter<MediaSmartFilter>,
	#[serde(default)]
	pub joiner: Option<FilterJoin>,
	#[serde(default)]
	pub default_grouping: Option<SmartListItemGrouping>,
}

async fn create_smart_list(
	State(ctx): State<AppState>,
	session: Session,
	Json(input): Json<CreateSmartList>,
) -> ApiResult<Json<SmartList>> {
	let user =
		get_user_and_enforce_permission(&session, UserPermission::AccessSmartList)?;
	let client = ctx.get_db();

	tracing::debug!(?input, "Creating smart list");

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
			chain_optional_iter(
				[smart_list::description::set(input.description)],
				[
					input
						.joiner
						.map(|joiner| smart_list::joiner::set(joiner.to_string())),
					input.default_grouping.map(|grouping| {
						smart_list::default_grouping::set(grouping.to_string())
					}),
				],
			),
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

	let access_condition = smart_list_access_for_user(&user, 1);
	let smart_list = client
		.smart_list()
		.find_first(vec![smart_list::id::equals(id), access_condition])
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

	let access_condition = smart_list_access_for_user(&user, 3);

	let smart_list = client
		.smart_list()
		.find_first(vec![smart_list::id::equals(id.clone()), access_condition])
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
) -> ApiResult<Json<SmartListItems>> {
	let user =
		get_user_and_enforce_permission(&session, UserPermission::AccessSmartList)?;

	let client = ctx.get_db();

	let access_condition = smart_list_access_for_user(&user, 1);
	let smart_list: SmartList = client
		.smart_list()
		.find_first(vec![smart_list::id::equals(id.clone()), access_condition])
		.exec()
		.await?
		.ok_or_else(|| ApiError::NotFound("Smart list not found".to_string()))?
		.try_into()?;

	let (tx, client) = client._transaction().begin().await?;

	match smart_list.build(&client, &user).await {
		Ok(items) => {
			tx.commit(client).await?;
			Ok(Json(items))
		},
		Err(e) => {
			tx.rollback(client).await?;
			tracing::error!(error = ?e, "Failed to execute smart list query");
			Err(e.into())
		},
	}
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

	let access_condition = smart_list_access_for_user(&user, 1);
	let smart_list: SmartList = client
		.smart_list()
		.find_first(vec![smart_list::id::equals(id.clone()), access_condition])
		.exec()
		.await?
		.ok_or_else(|| ApiError::NotFound("Smart list not found".to_string()))?
		.try_into()?;

	let params = smart_list.into_params();

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

// TODO: make me
async fn get_smart_list_access_rules() {
	unimplemented!()
}

async fn get_smart_list_views(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: Session,
) -> ApiResult<Json<Vec<SmartListView>>> {
	let user =
		get_user_and_enforce_permission(&session, UserPermission::AccessSmartList)?;
	let client = ctx.get_db();

	let access_condition = smart_list_access_for_user(&user, 1);
	let saved_smart_list_views = client
		.smart_list_view()
		.find_many(vec![
			smart_list_view::list_id::equals(id.clone()),
			smart_list_view::list::is(vec![access_condition]),
		])
		.exec()
		.await?;

	let smart_list_views = saved_smart_list_views
		.into_iter()
		.map(SmartListView::try_from)
		.collect::<Result<Vec<_>, _>>()?;

	Ok(Json(smart_list_views))
}

async fn get_smart_list_view(
	Path((id, name)): Path<(String, String)>,
	State(ctx): State<AppState>,
	session: Session,
) -> ApiResult<Json<SmartListView>> {
	let user =
		get_user_and_enforce_permission(&session, UserPermission::AccessSmartList)?;
	let client = ctx.get_db();

	let access_condition = smart_list_access_for_user(&user, 1);
	let smart_list = client
		.smart_list_view()
		.find_first(vec![
			smart_list_view::list_id::equals(id),
			smart_list_view::name::equals(name),
			smart_list_view::list::is(vec![access_condition]),
		])
		.exec()
		.await?
		.ok_or_else(|| ApiError::NotFound("Smart list not found".to_string()))?;

	Ok(Json(SmartListView::try_from(smart_list)?))
}

#[derive(Deserialize, Debug, Type, ToSchema)]
pub struct CreateSmartListView {
	pub name: String,
	#[serde(flatten)]
	pub config: SmartListViewConfig,
}

async fn create_smart_list_view(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: Session,
	Json(input): Json<CreateSmartListView>,
) -> ApiResult<Json<SmartListView>> {
	let user =
		get_user_and_enforce_permission(&session, UserPermission::AccessSmartList)?;
	let client = ctx.get_db();

	// NOTE: views are currently completely detatched from a user, rather they are tied
	// only to the smart list. This makes _this_ aspect a bit awkward. For now, to not over
	// complicate sharing and permissions, I will leave this as-is. But this can be a future
	// improvement down the road.
	let access_condition = smart_list_access_for_user(&user, 2);
	let smart_list = client
		.smart_list()
		.find_first(vec![smart_list::id::equals(id.clone()), access_condition])
		.exec()
		.await?
		.ok_or_else(|| ApiError::NotFound("Smart list not found".to_string()))?;

	let serialized_config = serde_json::to_vec(&input.config).map_err(|e| {
		tracing::error!(?e, "Failed to serialize smart list view config");
		ApiError::InternalServerError(e.to_string())
	})?;

	let smart_list_view = client
		.smart_list_view()
		.create(
			input.name,
			smart_list::id::equals(smart_list.id),
			serialized_config,
			vec![],
		)
		.exec()
		.await?;

	Ok(Json(SmartListView::try_from(smart_list_view)?))
}

#[derive(Deserialize, Debug, Type, ToSchema)]
pub struct UpdateSmartListView {
	pub name: String,
	#[serde(flatten)]
	pub config: SmartListViewConfig,
}

async fn update_smart_list_view(
	Path((id, name)): Path<(String, String)>,
	State(ctx): State<AppState>,
	session: Session,
	Json(input): Json<UpdateSmartListView>,
) -> ApiResult<Json<SmartListView>> {
	let user =
		get_user_and_enforce_permission(&session, UserPermission::AccessSmartList)?;
	let client = ctx.get_db();

	let access_condition = smart_list_access_for_user(&user, 2);
	let smart_list = client
		.smart_list()
		.find_first(vec![smart_list::id::equals(id.clone()), access_condition])
		.exec()
		.await?
		.ok_or_else(|| ApiError::NotFound("Smart list not found".to_string()))?;

	let serialized_config = serde_json::to_vec(&input.config).map_err(|e| {
		tracing::error!(?e, "Failed to serialize smart list view config");
		ApiError::InternalServerError(e.to_string())
	})?;

	let updated_smart_list_view = client
		.smart_list_view()
		.update(
			smart_list_view::list_id_name(smart_list.id, name),
			vec![
				smart_list_view::name::set(input.name),
				smart_list_view::data::set(serialized_config),
			],
		)
		.exec()
		.await?;

	Ok(Json(SmartListView::try_from(updated_smart_list_view)?))
}

async fn delete_smart_list_view(
	Path((id, name)): Path<(String, String)>,
	State(ctx): State<AppState>,
	session: Session,
) -> ApiResult<Json<SmartListView>> {
	let user =
		get_user_and_enforce_permission(&session, UserPermission::AccessSmartList)?;
	let client = ctx.get_db();

	let access_condition = smart_list_access_for_user(&user, 2);
	let smart_list = client
		.smart_list()
		.find_first(vec![smart_list::id::equals(id.clone()), access_condition])
		.exec()
		.await?
		.ok_or_else(|| ApiError::NotFound("Smart list not found".to_string()))?;

	let deleted_smart_list_view = client
		.smart_list_view()
		.delete(smart_list_view::list_id_name(smart_list.id, name))
		.exec()
		.await?;

	Ok(Json(SmartListView::try_from(deleted_smart_list_view)?))
}
