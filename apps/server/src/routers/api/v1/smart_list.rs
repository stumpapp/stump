use axum::{
	extract::{Path, State},
	middleware,
	routing::get,
	Extension, Json, Router,
};
use prisma_client_rust::{and, or};
use serde::{Deserialize, Serialize};
use serde_qs::axum::QsQuery;
use specta::Type;
use stump_core::{
	db::{
		entity::{
			macros::media_only_series_id, AccessRole, EntityVisibility, SmartList,
			SmartListItemGrouping, SmartListItems, SmartListView, SmartListViewConfig,
			User, UserPermission,
		},
		filter::{FilterJoin, MediaSmartFilter, SmartFilter},
	},
	prisma::{
		library, series, smart_list, smart_list_access_rule, smart_list_view, user,
	},
};
use utoipa::ToSchema;

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	filter::chain_optional_iter,
	middleware::auth::{auth_middleware, AuthContext},
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.route("/smart-lists", get(get_smart_lists).post(create_smart_list))
		.nest(
			"/smart-lists/{id}",
			Router::new()
				.route(
					"/",
					get(get_smart_list_by_id)
						.put(update_smart_list_by_id)
						.delete(delete_smart_list_by_id),
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
							"/{name}",
							Router::new().route(
								"/",
								get(get_smart_list_view)
									.put(update_smart_list_view)
									.delete(delete_smart_list_view),
							),
						),
				),
		)
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
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
			smart_list::visibility::equals(EntityVisibility::Public.to_string()),
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
			smart_list::visibility::equals(EntityVisibility::Shared.to_string()),
			base_rule
		],
		// condition where visibility is PRIVATE:
		and![
			smart_list::visibility::equals(EntityVisibility::Private.to_string()),
			smart_list::creator_id::equals(user_id)
		]
	]
}

#[derive(Deserialize, Debug, Type, ToSchema)]
pub struct GetSmartListsParams {
	#[serde(default)]
	all: Option<bool>,
	#[serde(default)]
	mine: Option<bool>,
	#[serde(default)]
	search: Option<String>,
}

#[utoipa::path(
    get,
    path = "/api/v1/smart-lists",
    tag = "smart_list",
    responses(
        (status = 200, description = "Successfully fetched smart lists", body = Vec<SmartList>),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    )
)]
async fn get_smart_lists(
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	QsQuery(params): QsQuery<GetSmartListsParams>,
) -> APIResult<Json<Vec<SmartList>>> {
	let user = req.user_and_enforce_permissions(&[UserPermission::AccessSmartList])?;
	let client = &ctx.db;

	let query_all = params.all.unwrap_or(false);
	if query_all && !user.is_server_owner {
		return Err(APIError::Forbidden(
			"You do not have permission to access this resource.".to_string(),
		));
	}

	let mine = params.mine.unwrap_or(false);
	if query_all && mine {
		return Err(APIError::BadRequest(
			"Cannot query all and mine at the same time".to_string(),
		));
	}

	let where_params = chain_optional_iter(
		[],
		[
			// If not querying all, and not querying mine, then we need to filter by access
			(!query_all && !mine)
				.then(|| smart_list_access_for_user(&user, AccessRole::Reader.value())),
			// If querying mine, then we need to filter by the user
			mine.then(|| smart_list::creator_id::equals(user.id.clone())),
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
pub struct CreateOrUpdateSmartList {
	pub name: String,
	pub description: Option<String>,
	pub filters: SmartFilter<MediaSmartFilter>,
	#[serde(default)]
	pub joiner: Option<FilterJoin>,
	#[serde(default)]
	pub default_grouping: Option<SmartListItemGrouping>,
	#[serde(default)]
	pub visibility: Option<EntityVisibility>,
}

#[utoipa::path(
	post,
	path = "/api/v1/smart-lists",
	tag = "smart_list",
	request_body = CreateOrUpdateSmartList,
	responses(
		(status = 200, description = "Successfully created smart list", body = SmartList),
		(status = 401, description = "Unauthorized"),
		(status = 500, description = "Internal server error")
	)
)]
async fn create_smart_list(
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	Json(input): Json<CreateOrUpdateSmartList>,
) -> APIResult<Json<SmartList>> {
	let user = req.user_and_enforce_permissions(&[UserPermission::AccessSmartList])?;
	let client = &ctx.db;

	tracing::debug!(?input, "Creating smart list");

	let serialized_filters = serde_json::to_vec(&input.filters).map_err(|e| {
		tracing::error!(?e, "Failed to serialize smart list filters");
		APIError::InternalServerError(e.to_string())
	})?;

	let smart_list = client
		.smart_list()
		.create(
			input.name,
			serialized_filters,
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
					input.visibility.map(|visibility| {
						smart_list::visibility::set(visibility.to_string())
					}),
				],
			),
		)
		.exec()
		.await?;

	tracing::trace!(?smart_list, "Created smart list");

	Ok(Json(SmartList::try_from(smart_list)?))
}

#[derive(Deserialize, Debug, Type, ToSchema)]
pub struct SmartListRelationOptions {
	#[serde(default)]
	#[specta(optional)]
	pub load_views: bool,
}

#[utoipa::path(
	get,
	path = "/api/v1/smart-lists/{id}",
	tag = "smart_list",
	responses(
		(status = 200, description = "Successfully fetched smart list", body = SmartList),
		(status = 401, description = "Unauthorized"),
		(status = 404, description = "Smart list not found"),
		(status = 500, description = "Internal server error")
	)
)]
async fn get_smart_list_by_id(
	Path(id): Path<String>,
	QsQuery(options): QsQuery<SmartListRelationOptions>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<SmartList>> {
	let user = req.user_and_enforce_permissions(&[UserPermission::AccessSmartList])?;
	let client = &ctx.db;

	let access_condition = smart_list_access_for_user(&user, AccessRole::Reader.value());
	let mut query = client
		.smart_list()
		.find_first(vec![smart_list::id::equals(id.clone()), access_condition]);

	if options.load_views {
		query = query.with(smart_list::saved_views::fetch(vec![]));
	}

	let smart_list = query
		.exec()
		.await?
		.ok_or_else(|| APIError::NotFound("Smart list not found".to_string()))?;

	Ok(Json(SmartList::try_from(smart_list)?))
}

#[utoipa::path(
	put,
	path = "/api/v1/smart-lists/{id}",
	tag = "smart_list",
	request_body = CreateOrUpdateSmartList,
	responses(
		(status = 200, description = "Successfully updated smart list", body = SmartList),
		(status = 401, description = "Unauthorized"),
		(status = 404, description = "Smart list not found"),
		(status = 500, description = "Internal server error")
	)
)]
async fn update_smart_list_by_id(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	Json(input): Json<CreateOrUpdateSmartList>,
) -> APIResult<Json<SmartList>> {
	let user = req.user_and_enforce_permissions(&[UserPermission::AccessSmartList])?;
	let client = &ctx.db;

	let access_condition = smart_list_access_for_user(&user, AccessRole::Writer.value());
	let smart_list = client
		.smart_list()
		.find_first(vec![smart_list::id::equals(id), access_condition])
		.exec()
		.await?
		.ok_or_else(|| APIError::NotFound("Smart list not found".to_string()))?;

	let serialized_filters = serde_json::to_vec(&input.filters).map_err(|e| {
		tracing::error!(?e, "Failed to serialize smart list filters");
		APIError::InternalServerError(e.to_string())
	})?;

	let updated_smart_list = client
		.smart_list()
		.update(
			smart_list::id::equals(smart_list.id),
			chain_optional_iter(
				[
					smart_list::name::set(input.name),
					smart_list::description::set(input.description),
					smart_list::filters::set(serialized_filters),
				],
				[
					input
						.joiner
						.map(|joiner| smart_list::joiner::set(joiner.to_string())),
					input.default_grouping.map(|grouping| {
						smart_list::default_grouping::set(grouping.to_string())
					}),
					input.visibility.map(|visibility| {
						smart_list::visibility::set(visibility.to_string())
					}),
				],
			),
		)
		.exec()
		.await?;

	Ok(Json(SmartList::try_from(updated_smart_list)?))
}

#[utoipa::path(
	delete,
	path = "/api/v1/smart-lists/{id}",
	tag = "smart_list",
	responses(
		(status = 200, description = "Successfully deleted smart list", body = SmartList),
		(status = 401, description = "Unauthorized"),
		(status = 404, description = "Smart list not found"),
		(status = 500, description = "Internal server error")
	)
)]
async fn delete_smart_list_by_id(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<SmartList>> {
	let user = req.user_and_enforce_permissions(&[UserPermission::AccessSmartList])?;
	let client = &ctx.db;

	let access_condition =
		smart_list_access_for_user(&user, AccessRole::CoCreator.value());

	let smart_list = client
		.smart_list()
		.find_first(vec![smart_list::id::equals(id.clone()), access_condition])
		.exec()
		.await?
		.ok_or_else(|| APIError::NotFound("Smart list not found".to_string()))?;

	let deleted_count = client
		.smart_list()
		.delete_many(vec![
			smart_list::id::equals(id),
			smart_list::creator_id::equals(user.id),
		])
		.exec()
		.await?;

	if deleted_count == 0 {
		return Err(APIError::NotFound("Smart list not found".to_string()));
	} else if deleted_count > 1 {
		tracing::warn!(
			?deleted_count,
			"Expected to delete one smart list, but deleted more than one!"
		);
	}

	Ok(Json(SmartList::try_from(smart_list)?))
}

#[utoipa::path(
	get,
	path = "/api/v1/smart-lists/{id}/items",
	tag = "smart_list",
	responses(
		(status = 200, description = "Successfully fetched smart list items", body = SmartListItems),
		(status = 401, description = "Unauthorized"),
		(status = 404, description = "Smart list not found"),
		(status = 500, description = "Internal server error")
	)
)]
async fn get_smart_list_items(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<SmartListItems>> {
	let user = req.user_and_enforce_permissions(&[UserPermission::AccessSmartList])?;

	let client = &ctx.db;

	let access_condition = smart_list_access_for_user(&user, AccessRole::Reader.value());
	let smart_list: SmartList = client
		.smart_list()
		.find_first(vec![smart_list::id::equals(id.clone()), access_condition])
		.exec()
		.await?
		.ok_or_else(|| APIError::NotFound("Smart list not found".to_string()))?
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

#[utoipa::path(
	get,
	path = "/api/v1/smart-lists/{id}/meta",
	tag = "smart_list",
	responses(
		(status = 200, description = "Successfully fetched smart list meta", body = SmartListMeta),
		(status = 401, description = "Unauthorized"),
		(status = 404, description = "Smart list not found"),
		(status = 500, description = "Internal server error")
	)
)]
async fn get_smart_list_meta(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<SmartListMeta>> {
	let user = req.user_and_enforce_permissions(&[UserPermission::AccessSmartList])?;
	let client = &ctx.db;

	let access_condition = smart_list_access_for_user(&user, AccessRole::Reader.value());
	let smart_list: SmartList = client
		.smart_list()
		.find_first(vec![smart_list::id::equals(id.clone()), access_condition])
		.exec()
		.await?
		.ok_or_else(|| APIError::NotFound("Smart list not found".to_string()))?
		.try_into()?;

	let params = smart_list.into_params_for_user(&user);
	let meta = client
		._transaction()
		.run(|tx| async move {
			let books = tx
				.media()
				.find_many(params)
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

#[utoipa::path(
	get,
	path = "/api/v1/smart-lists/{id}/views",
	tag = "smart_list",
	responses(
		(status = 200, description = "Successfully fetched smart list views", body = Vec<SmartListView>),
		(status = 401, description = "Unauthorized"),
		(status = 404, description = "Smart list not found"),
		(status = 500, description = "Internal server error")
	)
)]
async fn get_smart_list_views(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<Vec<SmartListView>>> {
	let user = req.user_and_enforce_permissions(&[UserPermission::AccessSmartList])?;
	let client = &ctx.db;

	let access_condition = smart_list_access_for_user(&user, AccessRole::Reader.value());
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

#[utoipa::path(
	get,
	path = "/api/v1/smart-lists/{id}/views/{name}",
	tag = "smart_list",
	responses(
		(status = 200, description = "Successfully fetched smart list view", body = SmartListView),
		(status = 401, description = "Unauthorized"),
		(status = 404, description = "Smart list view not found"),
		(status = 500, description = "Internal server error")
	)
)]
async fn get_smart_list_view(
	Path((id, name)): Path<(String, String)>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<SmartListView>> {
	let user = req.user_and_enforce_permissions(&[UserPermission::AccessSmartList])?;
	let client = &ctx.db;

	let access_condition = smart_list_access_for_user(&user, AccessRole::Reader.value());
	let smart_list = client
		.smart_list_view()
		.find_first(vec![
			smart_list_view::list_id::equals(id),
			smart_list_view::name::equals(name),
			smart_list_view::list::is(vec![access_condition]),
		])
		.exec()
		.await?
		.ok_or_else(|| APIError::NotFound("Smart list not found".to_string()))?;

	Ok(Json(SmartListView::try_from(smart_list)?))
}

#[derive(Deserialize, Debug, Type, ToSchema)]
pub struct CreateOrUpdateSmartListView {
	pub name: String,
	#[serde(flatten)]
	pub config: SmartListViewConfig,
}

#[utoipa::path(
	post,
	path = "/api/v1/smart-lists/{id}/views",
	tag = "smart_list",
	request_body = CreateOrUpdateSmartListView,
	responses(
		(status = 200, description = "Successfully created smart list view", body = SmartListView),
		(status = 401, description = "Unauthorized"),
		(status = 404, description = "Smart list not found"),
		(status = 500, description = "Internal server error")
	)
)]
async fn create_smart_list_view(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	Json(input): Json<CreateOrUpdateSmartListView>,
) -> APIResult<Json<SmartListView>> {
	let user = req.user_and_enforce_permissions(&[UserPermission::AccessSmartList])?;
	let client = &ctx.db;

	// NOTE: views are currently completely detached from a user, rather they are tied
	// only to the smart list. This makes _this_ aspect a bit awkward. For now, to not over
	// complicate sharing and permissions, I will leave this as-is. But this can be a future
	// improvement down the road.
	let access_condition = smart_list_access_for_user(&user, AccessRole::Writer.value());
	let smart_list = client
		.smart_list()
		.find_first(vec![smart_list::id::equals(id.clone()), access_condition])
		.exec()
		.await?
		.ok_or_else(|| APIError::NotFound("Smart list not found".to_string()))?;

	let serialized_config = serde_json::to_vec(&input.config).map_err(|e| {
		tracing::error!(?e, "Failed to serialize smart list view config");
		APIError::InternalServerError(e.to_string())
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

#[utoipa::path(
	put,
	path = "/api/v1/smart-lists/{id}/views/{name}",
	tag = "smart_list",
	request_body = CreateOrUpdateSmartListView,
	responses(
		(status = 200, description = "Successfully updated smart list view", body = SmartListView),
		(status = 401, description = "Unauthorized"),
		(status = 404, description = "Smart list view not found"),
		(status = 500, description = "Internal server error")
	)
)]
async fn update_smart_list_view(
	Path((id, name)): Path<(String, String)>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	Json(input): Json<CreateOrUpdateSmartListView>,
) -> APIResult<Json<SmartListView>> {
	let user = req.user_and_enforce_permissions(&[UserPermission::AccessSmartList])?;
	let client = &ctx.db;

	let access_condition = smart_list_access_for_user(&user, AccessRole::Writer.value());
	let smart_list = client
		.smart_list()
		.find_first(vec![smart_list::id::equals(id.clone()), access_condition])
		.exec()
		.await?
		.ok_or_else(|| APIError::NotFound("Smart list not found".to_string()))?;

	let serialized_config = serde_json::to_vec(&input.config).map_err(|e| {
		tracing::error!(?e, "Failed to serialize smart list view config");
		APIError::InternalServerError(e.to_string())
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

#[utoipa::path(
	delete,
	path = "/api/v1/smart-lists/{id}/views/{name}",
	tag = "smart_list",
	responses(
		(status = 200, description = "Successfully deleted smart list view", body = SmartListView),
		(status = 401, description = "Unauthorized"),
		(status = 404, description = "Smart list view not found"),
		(status = 500, description = "Internal server error")
	)
)]
async fn delete_smart_list_view(
	Path((id, name)): Path<(String, String)>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<SmartListView>> {
	let user = req.user_and_enforce_permissions(&[UserPermission::AccessSmartList])?;
	let client = &ctx.db;

	let access_condition = smart_list_access_for_user(&user, AccessRole::Writer.value());
	let smart_list = client
		.smart_list()
		.find_first(vec![smart_list::id::equals(id.clone()), access_condition])
		.exec()
		.await?
		.ok_or_else(|| APIError::NotFound("Smart list not found".to_string()))?;

	let deleted_smart_list_view = client
		.smart_list_view()
		.delete(smart_list_view::list_id_name(smart_list.id, name))
		.exec()
		.await?;

	Ok(Json(SmartListView::try_from(deleted_smart_list_view)?))
}
