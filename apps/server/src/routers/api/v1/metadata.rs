use std::collections::BTreeSet;

use axum::{extract::State, middleware, routing::get, Json, Router};
use serde::{Deserialize, Serialize};
use serde_qs::axum::QsQuery;
use specta::Type;
use stump_core::{
	db::entity::macros::{
		metadata_available_characters_select, metadata_available_colorists_select,
		metadata_available_editors_select, metadata_available_genre_select,
		metadata_available_inkers_select, metadata_available_letterers_select,
		metadata_available_pencillers_select, metadata_available_publisher_select,
		metadata_available_teams_select, metadata_available_writers_select,
	},
	prisma::{media_metadata, PrismaClient, SortOrder},
};
use tracing::trace;
use utoipa::ToSchema;

use crate::{
	config::state::AppState,
	errors::APIResult,
	filter::{FilterableQuery, MediaMetadataFilter},
	middleware::auth::auth_middleware,
	routers::api::filters::apply_media_metadata_filters,
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.nest(
			"/metadata/media",
			Router::new()
				.route("/", get(get_metadata_overview))
				.route("/genres", get(get_genres_handler))
				.route("/writers", get(get_writers_handler))
				.route("/pencillers", get(get_pencillers_handler))
				.route("/inkers", get(get_inkers_handler))
				.route("/colorists", get(get_colorists_handler))
				.route("/letterers", get(get_letterers_handler))
				.route("/editors", get(get_editors_handler))
				.route("/publishers", get(get_publishers_handler))
				.route("/characters", get(get_characters_handler))
				.route("/teams", get(get_teams_handler)),
		)
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
}

fn make_unique(iter: impl Iterator<Item = String>) -> Vec<String> {
	BTreeSet::<String>::from_iter(iter)
		.into_iter()
		.collect::<Vec<String>>()
}

fn list_str_to_vec(list: String) -> Vec<String> {
	list.split(',').map(|s| s.trim().to_string()).collect()
}

#[derive(Debug, Serialize, Deserialize, ToSchema, Type)]
pub struct MediaMetadataOverview {
	genres: Vec<String>,
	writers: Vec<String>,
	pencillers: Vec<String>,
	inkers: Vec<String>,
	colorists: Vec<String>,
	letterers: Vec<String>,
	editors: Vec<String>,
	publishers: Vec<String>,
	characters: Vec<String>,
	teams: Vec<String>,
}

#[utoipa::path(
	get,
	path = "/api/v1/metadata/media",
	tag = "metadata",
	responses(
		(status = 200, description = "Successfully fetched media metadata overview", body = MediaMetadataOverview),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 500, description = "Internal server error."),
	)
)]
async fn get_metadata_overview(
	filter_query: QsQuery<FilterableQuery<MediaMetadataFilter>>,
	State(ctx): State<AppState>,
) -> APIResult<Json<MediaMetadataOverview>> {
	let FilterableQuery { filters, .. } = filter_query.0.get();

	trace!(?filters, "get_metadata_overview");

	let db = &ctx.db;

	let result = db
		._transaction()
		.run(|client| async move {
			let where_conditions = apply_media_metadata_filters(filters);

			let genres = get_genres(&client, &where_conditions).await?;
			let writers = get_writers(&client, &where_conditions).await?;
			let pencillers = get_pencllers(&client, &where_conditions).await?;
			let inkers = get_inkers(&client, &where_conditions).await?;
			let colorists = get_colorists(&client, &where_conditions).await?;
			let letterers = get_letterers(&client, &where_conditions).await?;
			let editors = get_editors(&client, &where_conditions).await?;
			let publishers = get_publishers(&client, &where_conditions).await?;
			let characters = get_characters(&client, &where_conditions).await?;
			get_teams(&client, &where_conditions).await.map(|teams| {
				MediaMetadataOverview {
					genres,
					writers,
					pencillers,
					inkers,
					colorists,
					letterers,
					editors,
					publishers,
					characters,
					teams,
				}
			})
		})
		.await?;

	Ok(Json(result))
}

async fn get_genres(
	client: &PrismaClient,
	where_conditions: &[media_metadata::WhereParam],
) -> APIResult<Vec<String>> {
	let result = client
		.media_metadata()
		.find_many(where_conditions.to_vec())
		.order_by(media_metadata::genre::order(SortOrder::Asc))
		.select(metadata_available_genre_select::select())
		.exec()
		.await?;

	Ok(make_unique(
		result
			.into_iter()
			.filter_map(|d| d.genre)
			.flat_map(list_str_to_vec),
	))
}

#[utoipa::path(
	get,
	path = "/api/v1/metadata/media/genres",
	tag = "metadata",
	responses(
		(status = 200, description = "Successfully fetched genres", body = Vec<String>),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 500, description = "Internal server error."),
	)
)]
async fn get_genres_handler(
	filter_query: QsQuery<FilterableQuery<MediaMetadataFilter>>,
	State(ctx): State<AppState>,
) -> APIResult<Json<Vec<String>>> {
	let FilterableQuery { filters, .. } = filter_query.0.get();
	Ok(Json(
		get_genres(&ctx.db, &apply_media_metadata_filters(filters)).await?,
	))
}

async fn get_writers(
	client: &PrismaClient,
	where_conditions: &[media_metadata::WhereParam],
) -> APIResult<Vec<String>> {
	let result = client
		.media_metadata()
		.find_many(where_conditions.to_vec())
		.order_by(media_metadata::writers::order(SortOrder::Asc))
		.select(metadata_available_writers_select::select())
		.exec()
		.await?;

	Ok(make_unique(
		result
			.into_iter()
			.filter_map(|d| d.writers)
			.flat_map(list_str_to_vec),
	))
}

#[utoipa::path(
	get,
	path = "/api/v1/metadata/media/writers",
	tag = "metadata",
	responses(
		(status = 200, description = "Successfully fetched writers", body = Vec<String>),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 500, description = "Internal server error."),
	)
)]
async fn get_writers_handler(
	filter_query: QsQuery<FilterableQuery<MediaMetadataFilter>>,
	State(ctx): State<AppState>,
) -> APIResult<Json<Vec<String>>> {
	let FilterableQuery { filters, .. } = filter_query.0.get();
	Ok(Json(
		get_writers(&ctx.db, &apply_media_metadata_filters(filters)).await?,
	))
}

async fn get_pencllers(
	client: &PrismaClient,
	where_conditions: &[media_metadata::WhereParam],
) -> APIResult<Vec<String>> {
	let result = client
		.media_metadata()
		.find_many(where_conditions.to_vec())
		.order_by(media_metadata::pencillers::order(SortOrder::Asc))
		.select(metadata_available_pencillers_select::select())
		.exec()
		.await?;

	Ok(make_unique(
		result
			.into_iter()
			.filter_map(|d| d.pencillers)
			.flat_map(list_str_to_vec),
	))
}

#[utoipa::path(
	get,
	path = "/api/v1/metadata/media/pencillers",
	tag = "metadata",
	responses(
		(status = 200, description = "Successfully fetched pencillers", body = Vec<String>),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 500, description = "Internal server error."),
	)
)]
async fn get_pencillers_handler(
	filter_query: QsQuery<FilterableQuery<MediaMetadataFilter>>,
	State(ctx): State<AppState>,
) -> APIResult<Json<Vec<String>>> {
	let FilterableQuery { filters, .. } = filter_query.0.get();
	Ok(Json(
		get_pencllers(&ctx.db, &apply_media_metadata_filters(filters)).await?,
	))
}

async fn get_inkers(
	client: &PrismaClient,
	where_conditions: &[media_metadata::WhereParam],
) -> APIResult<Vec<String>> {
	let result = client
		.media_metadata()
		.find_many(where_conditions.to_vec())
		.order_by(media_metadata::inkers::order(SortOrder::Asc))
		.select(metadata_available_inkers_select::select())
		.exec()
		.await?;

	Ok(make_unique(
		result
			.into_iter()
			.filter_map(|d| d.inkers)
			.flat_map(list_str_to_vec),
	))
}

#[utoipa::path(
	get,
	path = "/api/v1/metadata/media/inkers",
	tag = "metadata",
	responses(
		(status = 200, description = "Successfully fetched inkers", body = Vec<String>),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 500, description = "Internal server error."),
	)
)]
async fn get_inkers_handler(
	filter_query: QsQuery<FilterableQuery<MediaMetadataFilter>>,
	State(ctx): State<AppState>,
) -> APIResult<Json<Vec<String>>> {
	let FilterableQuery { filters, .. } = filter_query.0.get();
	Ok(Json(
		get_inkers(&ctx.db, &apply_media_metadata_filters(filters)).await?,
	))
}

async fn get_colorists(
	client: &PrismaClient,
	where_conditions: &[media_metadata::WhereParam],
) -> APIResult<Vec<String>> {
	let result = client
		.media_metadata()
		.find_many(where_conditions.to_vec())
		.order_by(media_metadata::colorists::order(SortOrder::Asc))
		.select(metadata_available_colorists_select::select())
		.exec()
		.await?;

	Ok(make_unique(
		result
			.into_iter()
			.filter_map(|d| d.colorists)
			.flat_map(list_str_to_vec),
	))
}

#[utoipa::path(
	get,
	path = "/api/v1/metadata/media/colorists",
	tag = "metadata",
	responses(
		(status = 200, description = "Successfully fetched colorists", body = Vec<String>),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 500, description = "Internal server error."),
	)
)]
async fn get_colorists_handler(
	filter_query: QsQuery<FilterableQuery<MediaMetadataFilter>>,
	State(ctx): State<AppState>,
) -> APIResult<Json<Vec<String>>> {
	let FilterableQuery { filters, .. } = filter_query.0.get();
	Ok(Json(
		get_colorists(&ctx.db, &apply_media_metadata_filters(filters)).await?,
	))
}

async fn get_letterers(
	client: &PrismaClient,
	where_conditions: &[media_metadata::WhereParam],
) -> APIResult<Vec<String>> {
	let result = client
		.media_metadata()
		.find_many(where_conditions.to_vec())
		.order_by(media_metadata::letterers::order(SortOrder::Asc))
		.select(metadata_available_letterers_select::select())
		.exec()
		.await?;

	Ok(make_unique(
		result
			.into_iter()
			.filter_map(|d| d.letterers)
			.flat_map(list_str_to_vec),
	))
}

#[utoipa::path(
	get,
	path = "/api/v1/metadata/media/letterers",
	tag = "metadata",
	responses(
		(status = 200, description = "Successfully fetched letterers", body = Vec<String>),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 500, description = "Internal server error."),
	)
)]
async fn get_letterers_handler(
	filter_query: QsQuery<FilterableQuery<MediaMetadataFilter>>,
	State(ctx): State<AppState>,
) -> APIResult<Json<Vec<String>>> {
	let FilterableQuery { filters, .. } = filter_query.0.get();
	Ok(Json(
		get_letterers(&ctx.db, &apply_media_metadata_filters(filters)).await?,
	))
}

async fn get_editors(
	client: &PrismaClient,
	where_conditions: &[media_metadata::WhereParam],
) -> APIResult<Vec<String>> {
	let result = client
		.media_metadata()
		.find_many(where_conditions.to_vec())
		.order_by(media_metadata::editors::order(SortOrder::Asc))
		.select(metadata_available_editors_select::select())
		.exec()
		.await?;

	Ok(make_unique(
		result
			.into_iter()
			.filter_map(|d| d.editors)
			.flat_map(list_str_to_vec),
	))
}

#[utoipa::path(
	get,
	path = "/api/v1/metadata/media/editors",
	tag = "metadata",
	responses(
		(status = 200, description = "Successfully fetched editors", body = Vec<String>),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 500, description = "Internal server error."),
	)
)]
async fn get_editors_handler(
	filter_query: QsQuery<FilterableQuery<MediaMetadataFilter>>,
	State(ctx): State<AppState>,
) -> APIResult<Json<Vec<String>>> {
	let FilterableQuery { filters, .. } = filter_query.0.get();
	Ok(Json(
		get_editors(&ctx.db, &apply_media_metadata_filters(filters)).await?,
	))
}

async fn get_publishers(
	client: &PrismaClient,
	where_conditions: &[media_metadata::WhereParam],
) -> APIResult<Vec<String>> {
	let result = client
		.media_metadata()
		.find_many(where_conditions.to_vec())
		.order_by(media_metadata::publisher::order(SortOrder::Asc))
		.select(metadata_available_publisher_select::select())
		.exec()
		.await?;

	Ok(make_unique(
		result
			.into_iter()
			.filter_map(|d| d.publisher)
			.flat_map(list_str_to_vec),
	))
}

#[utoipa::path(
	get,
	path = "/api/v1/metadata/media/publishers",
	tag = "metadata",
	responses(
		(status = 200, description = "Successfully fetched publishers", body = Vec<String>),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 500, description = "Internal server error."),
	)
)]
async fn get_publishers_handler(
	filter_query: QsQuery<FilterableQuery<MediaMetadataFilter>>,
	State(ctx): State<AppState>,
) -> APIResult<Json<Vec<String>>> {
	let FilterableQuery { filters, .. } = filter_query.0.get();
	Ok(Json(
		get_publishers(&ctx.db, &apply_media_metadata_filters(filters)).await?,
	))
}

async fn get_characters(
	client: &PrismaClient,
	where_conditions: &[media_metadata::WhereParam],
) -> APIResult<Vec<String>> {
	let result = client
		.media_metadata()
		.find_many(where_conditions.to_vec())
		.order_by(media_metadata::characters::order(SortOrder::Asc))
		.select(metadata_available_characters_select::select())
		.exec()
		.await?;

	Ok(make_unique(
		result
			.into_iter()
			.filter_map(|d| d.characters)
			.flat_map(list_str_to_vec),
	))
}

#[utoipa::path(
	get,
	path = "/api/v1/metadata/media/characters",
	tag = "metadata",
	responses(
		(status = 200, description = "Successfully fetched characters", body = Vec<String>),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 500, description = "Internal server error."),
	)
)]
async fn get_characters_handler(
	filter_query: QsQuery<FilterableQuery<MediaMetadataFilter>>,
	State(ctx): State<AppState>,
) -> APIResult<Json<Vec<String>>> {
	let FilterableQuery { filters, .. } = filter_query.0.get();
	Ok(Json(
		get_characters(&ctx.db, &apply_media_metadata_filters(filters)).await?,
	))
}

async fn get_teams(
	client: &PrismaClient,
	where_conditions: &[media_metadata::WhereParam],
) -> APIResult<Vec<String>> {
	let result = client
		.media_metadata()
		.find_many(where_conditions.to_vec())
		.order_by(media_metadata::teams::order(SortOrder::Asc))
		.select(metadata_available_teams_select::select())
		.exec()
		.await?;

	Ok(make_unique(
		result
			.into_iter()
			.filter_map(|d| d.teams)
			.flat_map(list_str_to_vec),
	))
}

#[utoipa::path(
	get,
	path = "/api/v1/metadata/media/teams",
	tag = "metadata",
	responses(
		(status = 200, description = "Successfully fetched teams", body = Vec<String>),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 500, description = "Internal server error."),
	)
)]
async fn get_teams_handler(
	filter_query: QsQuery<FilterableQuery<MediaMetadataFilter>>,
	State(ctx): State<AppState>,
) -> APIResult<Json<Vec<String>>> {
	let FilterableQuery { filters, .. } = filter_query.0.get();
	Ok(Json(
		get_teams(&ctx.db, &apply_media_metadata_filters(filters)).await?,
	))
}
