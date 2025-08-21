use axum::{
	extract::{Path, State},
	middleware,
	routing::get,
	Extension, Json, Router,
};
use axum_extra::extract::Query;
use prisma_client_rust::{and, or};
use stump_core::{
	db::{
		entity::{CreateReadingList, ReadingList},
		query::pagination::{Pageable, Pagination, PaginationQuery},
	},
	prisma::{reading_list, reading_list_rbac, user},
};
use tracing::trace;

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	middleware::auth::{auth_middleware, AuthContext},
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.route(
			"/reading-list",
			get(get_reading_list).post(create_reading_list),
		)
		.nest(
			"/reading-list/{id}",
			Router::new().route(
				"/",
				get(get_reading_list_by_id)
					.put(update_reading_list)
					.delete(delete_reading_list_by_id),
			),
		)
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
}

// TODO: thumbnails for reading lists

/// Generates a single RBAC condition for a reading list query
pub(crate) fn reading_list_rbac_for_user(
	user_id: String,
	minimum_role: i32,
) -> reading_list::WhereParam {
	// A common condition that asserts there is a RBAC entry for the user that has a role
	// greater than or equal to the minimum role:
	// 1 for reader, 2 for collaborator, 3 for creator
	let base_rbac = reading_list::access_control::some(vec![and![
		reading_list_rbac::user_id::equals(user_id.clone()),
		reading_list_rbac::role::gte(minimum_role),
	]]);

	or![
		// creator always has access
		reading_list::creating_user_id::equals(user_id.clone()),
		// condition where visibility is PUBLIC:
		and![
			reading_list::visibility::equals("PUBLIC".to_string()),
			// This asserts the reader RBAC is present OR there is no RBAC present
			or![
				base_rbac.clone(),
				// This asserts there is no RBAC present
				reading_list::access_control::none(vec![
					reading_list_rbac::user_id::equals(user_id.clone())
				])
			]
		],
		// condition where visibility is SHARED:
		and![
			reading_list::visibility::equals("SHARED".to_string()),
			base_rbac
		],
		// condition where visibility is PRIVATE:
		and![
			reading_list::visibility::equals("PRIVATE".to_string()),
			reading_list::creating_user_id::equals(user_id)
		]
	]
}

pub(crate) fn apply_pagination<'a>(
	query: reading_list::FindMany<'a>,
	pagination: &Pagination,
) -> reading_list::FindMany<'a> {
	match pagination {
		Pagination::Page(page_query) => {
			let (skip, take) = page_query.get_skip_take();
			query.skip(skip).take(take)
		},
		Pagination::Cursor(cursor_params) => {
			let mut cursor_query = query;
			if let Some(cursor) = cursor_params.cursor.as_deref() {
				cursor_query = cursor_query
					.cursor(reading_list::id::equals(cursor.to_string()))
					.skip(1);
			}
			if let Some(limit) = cursor_params.limit {
				cursor_query = cursor_query.take(limit);
			}
			cursor_query
		},
		_ => query,
	}
}

#[utoipa::path(
	get,
	path = "/api/v1/reading-list",
	tag = "reading-list",
	responses(
		(status = 200, description = "Successfully fetched reading lists.", body = [ReadingList]),
		(status = 401, description = "Unauthorized."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Fetches all reading lists for the current user.
async fn get_reading_list(
	State(ctx): State<AppState>,
	pagination_query: Query<PaginationQuery>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<Pageable<Vec<ReadingList>>>> {
	let user_id = req.id();

	let pagination = pagination_query.0.get();

	trace!(?pagination, "get_reading_list");

	let is_unpaged = pagination.is_unpaged();
	let pagination_cloned = pagination.clone();

	let rbac_condition = reading_list_rbac_for_user(user_id, 1);
	let rbac_condition_cloned = rbac_condition.clone();

	let (reading_lists, count) = ctx
		.db
		._transaction()
		.run(|client| async move {
			let mut query = client
				.reading_list()
				.find_many(vec![rbac_condition_cloned.clone()]);

			if !is_unpaged {
				query = apply_pagination(query, &pagination_cloned);
			}

			let reading_lists = query
				.exec()
				.await?
				.into_iter()
				.map(ReadingList::from)
				.collect();

			if is_unpaged {
				return Ok((reading_lists, None));
			}

			client
				.reading_list()
				.count(vec![rbac_condition_cloned.clone()])
				.exec()
				.await
				.map(|count| (reading_lists, Some(count)))
		})
		.await?;

	if let Some(count) = count {
		return Ok(Json(Pageable::from((reading_lists, count, pagination))));
	}

	Ok(Json(Pageable::from(reading_lists)))
}

#[utoipa::path(
	post,
	path = "/api/v1/reading-list",
	tag = "reading-list",
	request_body = CreateReadingList,
	responses(
		(status = 200, description = "Successfully created reading list.", body = ReadingList),
		(status = 401, description = "Unauthorized."),
		(status = 500, description = "Internal server error."),
	)
)]
async fn create_reading_list(
	Extension(req): Extension<AuthContext>,
	State(ctx): State<AppState>,
	Json(input): Json<CreateReadingList>,
) -> APIResult<Json<ReadingList>> {
	let db = &ctx.db;
	let user_id = req.id();

	let created_reading_list = db
		._transaction()
		.run(|client| async move {
			let reading_list = client
				.reading_list()
				.create(
					input.id.clone(),
					user::id::equals(user_id.clone()),
					vec![reading_list::visibility::set(
						input.visibility.unwrap_or_default().to_string(),
					)],
				)
				.exec()
				.await?;

			// create reading_list_items for each media_id in input
			let reading_list_item_creates = input
				.media_ids
				.iter()
				.enumerate()
				.map(|(idx, media_id)| {
					client.reading_list_item().create(
						idx as i32,
						media_id.clone(),
						reading_list::id::equals(reading_list.id.clone()),
						// TODO: determine if connect is still needed...
						vec![],
					)
				})
				//* Note: I had to collect because of a "higher-ranked lifetime error"
				//* that would occur when trying to pass the iterator directly to _batch
				.collect::<Vec<_>>();

			client
				._batch(reading_list_item_creates)
				.await
				.map(|items| ReadingList::from((reading_list, items)))
		})
		.await?;

	Ok(Json(created_reading_list))
}

#[utoipa::path(
	get,
	path = "/api/v1/reading-list/{id}",
	tag = "reading-list",
	params(
		("id" = String, Path, description = "The ID of the reading list to fetch.")
	),
	responses(
		(status = 200, description = "Successfully fetched reading list.", body = ReadingList),
		(status = 401, description = "Unauthorized."),
		(status = 404, description = "Reading list not found."),
		(status = 500, description = "Internal server error."),
	)
)]
async fn get_reading_list_by_id(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<ReadingList>> {
	let user_id = req.id();
	let db = &ctx.db;

	let rbac_condition = reading_list_rbac_for_user(user_id, 1);

	let reading_list = db
		.reading_list()
		.find_first(vec![and![
			reading_list::id::equals(id.clone()),
			rbac_condition.clone(),
		]])
		.exec()
		.await?
		.ok_or_else(|| {
			APIError::NotFound(format!("Reading list with ID {id} not found"))
		})?;

	Ok(Json(ReadingList::from(reading_list)))
}

// TODO: fix this endpoint, way too naive of an update...
#[utoipa::path(
	put,
	path = "/api/v1/reading-list/{id}",
	tag = "reading-list",
	params(
		("id" = String, Path, description = "The ID of the reading list to update.")
	),
	request_body = CreateReadingList,
	responses(
		(status = 200, description = "Successfully updated reading list.", body = ReadingList),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 404, description = "Reading list not found."),
		(status = 500, description = "Internal server error."),
	)
)]
async fn update_reading_list(
	Extension(req): Extension<AuthContext>,
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Json(input): Json<CreateReadingList>,
) -> APIResult<Json<ReadingList>> {
	let user = req.user();
	let db = &ctx.db;

	trace!(?input, "update_reading_list");

	let reading_list = db
		.reading_list()
		.find_unique(reading_list::id::equals(id.clone()))
		.exec()
		.await?
		.ok_or_else(|| {
			APIError::NotFound(format!("Reading List with id {id} not found"))
		})?;

	if reading_list.creating_user_id != user.id {
		// TODO: log bad access attempt to DB
		return Err(APIError::Forbidden(String::from(
			"You do not have permission to access this resource.",
		)));
	}

	Err(APIError::NotImplemented)

	// let created_reading_list = db
	// 	.reading_list()
	// 	.update(
	// 		reading_list::id::equals(id.clone()),
	// 		vec![reading_list::items::connect(
	// 			input
	// 				.media_ids
	// 				.iter()
	// 				.map(|id| media::id::equals(id.to_string()))
	// 				.collect(),
	// 		)],
	// 	)
	// 	.exec()
	// 	.await?;

	// Ok(Json(created_reading_list.into()))
}

#[utoipa::path(
	delete,
	path = "/api/v1/reading-list/{id}",
	tag = "reading-list",
	params(
		("id" = String, Path, description = "The ID of the reading list to delete.")
	),
	responses(
		(status = 200, description = "Successfully deleted reading list.", body = ReadingList),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 404, description = "Reading list not found."),
		(status = 500, description = "Internal server error."),
	)
)]
async fn delete_reading_list_by_id(
	Extension(req): Extension<AuthContext>,
	Path(id): Path<String>,
	State(ctx): State<AppState>,
) -> APIResult<Json<ReadingList>> {
	let user = req.user();
	let db = &ctx.db;

	let reading_list = db
		.reading_list()
		.find_unique(reading_list::id::equals(id.clone()))
		.exec()
		.await?
		.ok_or_else(|| {
			APIError::NotFound(format!("Reading List with id {id} not found"))
		})?;

	if reading_list.creating_user_id != user.id {
		// TODO: log bad access attempt to DB
		return Err(APIError::forbidden_discreet());
	}

	trace!("Attempting to delete reading list with ID {}", &id);
	let deleted = db
		.reading_list()
		.delete(reading_list::id::equals(id.clone()))
		.exec()
		.await?;

	Ok(Json(deleted.into()))
}
