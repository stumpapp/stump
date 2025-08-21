use std::{ops::Deref, path::PathBuf};

use axum::{
	extract::{Path, Query, State},
	http::{header, HeaderValue},
	middleware,
	response::IntoResponse,
	routing::get,
	Extension, Json, Router,
};
use graphql::{data::AuthContext, pagination::OffsetPagination};
use models::{
	entity::{
		library, media, media_metadata, reading_session, series, series_metadata,
		user::AuthUser,
	},
	shared::enums::UserPermission,
};
use sea_orm::{prelude::*, Condition, Order, QueryOrder, QueryTrait};
use sea_orm::{PaginatorTrait, QuerySelect};
use serde::{Deserialize, Serialize};
use stump_core::{
	filesystem::media::get_page_async,
	opds::v2_0::{
		authentication::{
			OPDSAuthenticationDocument, OPDSAuthenticationDocumentBuilder,
			OPDSSupportedAuthFlow, OPDS_AUTHENTICATION_DOCUMENT_TYPE,
		},
		entity::{OPDSProgressionEntity, OPDSPublicationEntity},
		feed::{OPDSFeed, OPDSFeedBuilder},
		group::OPDSFeedGroupBuilder,
		link::{
			OPDSBaseLinkBuilder, OPDSLink, OPDSLinkFinalizer, OPDSLinkRel, OPDSLinkType,
			OPDSNavigationLink, OPDSNavigationLinkBuilder,
		},
		metadata::{OPDSMetadata, OPDSMetadataBuilder, OPDSPaginationMetadataBuilder},
		progression::OPDSProgression,
		publication::OPDSPublication,
	},
	utils::chain_optional_iter,
	Ctx,
};

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	middleware::{auth::auth_middleware, host::HostExtractor},
	routers::{api::v2::media::get_media_thumbnail_by_id, relative_favicon_path},
	utils::http::{ImageResponse, NamedFile},
};

const DEFAULT_LIMIT: u64 = 10;

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.nest(
			"/v2.0",
			Router::new()
				.route("/auth", get(auth))
				.route("/catalog", get(catalog))
				.route("/search", get(search))
				.nest(
					"/libraries",
					Router::new().route("/", get(browse_libraries)).nest(
						"/{id}",
						Router::new().route("/", get(browse_library_by_id)).nest(
							"/books",
							Router::new()
								.route("/", get(browse_library_books))
								.route("/latest", get(latest_library_books)),
						),
					),
				)
				.nest(
					"/series",
					Router::new().route("/", get(browse_series)).nest(
						"/{id}",
						Router::new().route("/", get(browse_series_by_id)),
					),
				)
				.nest(
					"/books",
					Router::new()
						.route("/browse", get(browse_books))
						.route("/latest", get(latest_books))
						.route("/keep-reading", get(keep_reading))
						.nest(
							"/{id}",
							Router::new()
								.route("/", get(get_book_by_id))
								.route("/thumbnail", get(get_book_thumbnail))
								.route("/pages/{page}", get(get_book_page))
								// TODO: PUT progression
								.route("/progression", get(get_book_progression))
								.route("/file", get(download_book)),
						),
				),
		)
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
}

/// A wrapper struct for an OPDS authentication document, which is used to set the
/// appropriate content type header. The Json extractor would otherwise set it incorrectly
struct OPDSAuthDocWrapper(OPDSAuthenticationDocument);

impl IntoResponse for OPDSAuthDocWrapper {
	fn into_response(self) -> axum::http::Response<axum::body::Body> {
		let mut base_resp = Json(self.0).into_response();
		let Ok(header_value) = HeaderValue::from_str(OPDS_AUTHENTICATION_DOCUMENT_TYPE)
		else {
			tracing::error!(
				"Failed to convert OPDS_AUTHENTICATION_DOCUMENT_TYPE to HeaderValue"
			);
			return base_resp;
		};
		base_resp
			.headers_mut()
			.insert(header::CONTENT_TYPE, header_value);
		base_resp
	}
}

#[derive(Debug, Default, Serialize, Deserialize)]
struct OPDSSearchQuery {
	#[serde(default)]
	query: Option<String>,
}

#[tracing::instrument]
async fn auth(HostExtractor(host): HostExtractor) -> APIResult<OPDSAuthDocWrapper> {
	Ok(OPDSAuthDocWrapper(
		OPDSAuthenticationDocumentBuilder::default()
			.description(OPDSSupportedAuthFlow::Basic.description().to_string())
			.links(vec![
				OPDSLink::help(),
				OPDSLink::logo(format!("{}{}", host.url(), relative_favicon_path())),
			])
			.build()?,
	))
}

#[tracing::instrument(err, skip(ctx))]
async fn catalog(
	State(ctx): State<AppState>,
	HostExtractor(host): HostExtractor,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<OPDSFeed>> {
	let user = req.user();
	let link_finalizer = OPDSLinkFinalizer::from(host);

	let libraries = library::Entity::find_for_user(&user)
		.limit(DEFAULT_LIMIT)
		.all(ctx.conn.as_ref())
		.await?;
	let library_count = library::Entity::find_for_user(&user)
		.count(ctx.conn.as_ref())
		.await?;
	let library_group = OPDSFeedGroupBuilder::default()
		.metadata(
			OPDSMetadataBuilder::default()
				.title("Libraries".to_string())
				.pagination(Some(
					OPDSPaginationMetadataBuilder::default()
						.number_of_items(library_count)
						.items_per_page(DEFAULT_LIMIT)
						.current_page(1)
						.build()?,
				))
				.build()?,
		)
		.links(link_finalizer.finalize_all(vec![OPDSLink::Link(
				OPDSBaseLinkBuilder::default()
					.href("/opds/v2.0/libraries".to_string())
					.rel(OPDSLinkRel::SelfLink.item())
					.build()?,
			)]))
		.navigation(
			libraries
				.into_iter()
				.map(OPDSNavigationLink::from)
				.map(|link| link.finalize(&link_finalizer))
				.collect::<Vec<OPDSNavigationLink>>(),
		)
		.build()?;

	// let latest_books_conditions = apply_media_restrictions_for_user(user);
	let latest_books = OPDSPublicationEntity::find_for_user(&user)
		.limit(DEFAULT_LIMIT)
		.order_by_asc(media::Column::CreatedAt)
		.into_model::<OPDSPublicationEntity>()
		.all(ctx.conn.as_ref())
		.await?;
	let latest_books_count = media::Entity::find_for_user(&user)
		.count(ctx.conn.as_ref())
		.await?;
	let publications = OPDSPublication::vec_from_books(
		ctx.conn.as_ref(),
		link_finalizer.clone(),
		latest_books,
	)
	.await?;
	let latest_books_group = OPDSFeedGroupBuilder::default()
		.metadata(
			OPDSMetadataBuilder::default()
				.title("Latest Books".to_string())
				.pagination(Some(
					OPDSPaginationMetadataBuilder::default()
						.number_of_items(latest_books_count)
						.items_per_page(DEFAULT_LIMIT)
						.current_page(1)
						.build()?,
				))
				.build()?,
		)
		.links(link_finalizer.finalize_all(vec![OPDSLink::Link(
			OPDSBaseLinkBuilder::default()
				.href("/opds/v2.0/books/latest".to_string())
				.rel(OPDSLinkRel::SelfLink.item())
				.build()?,
		)]))
		.publications(publications)
		.build()?;

	let in_progress_filter = Condition::all()
		.add(reading_session::Column::UserId.eq(user.id.clone()))
		.add(
			Condition::any()
				.add(reading_session::Column::Page.gt(0))
				.add(reading_session::Column::Epubcfi.is_not_null()),
		);
	let continue_reading = OPDSPublicationEntity::find_for_user(&user)
		.filter(in_progress_filter.clone())
		.limit(DEFAULT_LIMIT)
		.order_by_asc(reading_session::Column::UpdatedAt)
		.into_model::<OPDSPublicationEntity>()
		.all(ctx.conn.as_ref())
		.await?;
	let continue_reading_count = OPDSPublicationEntity::find_for_user(&user)
		.filter(in_progress_filter)
		.count(ctx.conn.as_ref())
		.await?;

	let publications = OPDSPublication::vec_from_books(
		ctx.conn.as_ref(),
		link_finalizer.clone(),
		continue_reading,
	)
	.await?;
	let keep_reading_group = OPDSFeedGroupBuilder::default()
		.metadata(
			OPDSMetadataBuilder::default()
				.title("Keep Reading".to_string())
				.pagination(Some(
					OPDSPaginationMetadataBuilder::default()
						.number_of_items(continue_reading_count)
						.items_per_page(DEFAULT_LIMIT)
						.current_page(1)
						.build()?,
				))
				.build()?,
		)
		.links(link_finalizer.finalize_all(vec![OPDSLink::Link(
			OPDSBaseLinkBuilder::default()
				.href("/opds/v2.0/books/keep-reading".to_string())
				.rel(OPDSLinkRel::SelfLink.item())
				.build()?,
		)]))
		.publications(publications)
		.build()?;

	Ok(Json(
		OPDSFeedBuilder::default()
			.metadata(
				OPDSMetadataBuilder::default()
					.title("Stump OPDS V2 Catalog".to_string())
					.modified(OPDSMetadata::generate_modified())
					.build()?,
			)
			.links(link_finalizer.finalize_all(vec![
				OPDSBaseLinkBuilder::default()
					.href("/opds/v2.0/catalog".to_string())
					.rel(OPDSLinkRel::SelfLink.item())
					.build()?.as_link(),
				OPDSBaseLinkBuilder::default()
					.href("/opds/v2.0/catalog".to_string())
					.rel(OPDSLinkRel::Start.item())
					.build()?.as_link(),
				OPDSBaseLinkBuilder::default()
					.href("/opds/v2.0/search{?query}".to_string())
					.rel(OPDSLinkRel::Search.item())
					._type(OPDSLinkType::OpdsJson)
					.templated(true)
					.build()?.as_link(),
			]))
			.navigation(vec![OPDSNavigationLinkBuilder::default()
				.title("Libraries".to_string())
				.base_link(
					OPDSBaseLinkBuilder::default()
						.href(link_finalizer.format_link("/opds/v2.0/libraries"))
						.rel(OPDSLinkRel::Subsection.item())
						.build()?,
				)
				.build()?])
			.groups(vec![library_group, latest_books_group, keep_reading_group])
			.build()?,
	))
}

#[tracing::instrument(err, skip(ctx))]
async fn search(
	State(ctx): State<AppState>,
	HostExtractor(host): HostExtractor,
	Query(OPDSSearchQuery { query }): Query<OPDSSearchQuery>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<OPDSFeed>> {
	let user = req.user();
	let link_finalizer = OPDSLinkFinalizer::from(host);
	let query = query.ok_or(APIError::BadRequest(
		"Query parameter is required".to_string(),
	))?;

	let libraries = library::Entity::find_for_user(&user)
		.filter(library::Column::Name.contains(query.clone()))
		.limit(DEFAULT_LIMIT)
		.all(ctx.conn.as_ref())
		.await?;
	let library_count = library::Entity::find_for_user(&user)
		.filter(library::Column::Name.contains(query.clone()))
		.count(ctx.conn.as_ref())
		.await?;

	let library_group = OPDSFeedGroupBuilder::default()
		.metadata(
			OPDSMetadataBuilder::default()
				.title("Libraries".to_string())
				.pagination(Some(
					OPDSPaginationMetadataBuilder::default()
						.number_of_items(library_count)
						.items_per_page(DEFAULT_LIMIT)
						.current_page(1)
						.build()?,
				))
				.build()?,
		)
		.links(link_finalizer.finalize_all(vec![OPDSLink::Link(
				OPDSBaseLinkBuilder::default()
					.href(format!("/opds/v2.0/libraries/search?query={}", query.clone()))
					.rel(OPDSLinkRel::SelfLink.item())
					.build()?,
			)]))
		.navigation(
			libraries
				.into_iter()
				.map(OPDSNavigationLink::from)
				.map(|link| link.finalize(&link_finalizer))
				.collect::<Vec<OPDSNavigationLink>>(),
		)
		.build()?;

	let series_condition = Condition::any()
		.add(series::Column::Name.contains(query.clone()))
		.add(series_metadata::Column::Title.contains(query.clone()));
	let series = series::Entity::find_for_user(&user)
		.filter(series_condition.clone())
		.left_join(series_metadata::Entity)
		.limit(DEFAULT_LIMIT)
		.all(ctx.conn.as_ref())
		.await?;
	let series_count = series::Entity::find_for_user(&user)
		.filter(series_condition)
		.count(ctx.conn.as_ref())
		.await?;

	let series_group = OPDSFeedGroupBuilder::default()
		.metadata(
			OPDSMetadataBuilder::default()
				.title("Series".to_string())
				.pagination(Some(
					OPDSPaginationMetadataBuilder::default()
						.number_of_items(series_count)
						.items_per_page(DEFAULT_LIMIT)
						.current_page(1)
						.build()?,
				))
				.build()?,
		)
		.links(link_finalizer.finalize_all(vec![OPDSLink::Link(
				OPDSBaseLinkBuilder::default()
					.href(format!("/opds/v2.0/series/search?query={}", query.clone()))
					.rel(OPDSLinkRel::SelfLink.item())
					.build()?,
			)]))
		.navigation(
			series
				.into_iter()
				.map(OPDSNavigationLink::from)
				.map(|link| link.finalize(&link_finalizer))
				.collect::<Vec<OPDSNavigationLink>>(),
		)
		.build()?;

	let book_condition = Condition::any()
		.add(media::Column::Name.contains(query.clone()))
		.add(media_metadata::Column::Title.contains(query.clone()));
	let books = OPDSPublicationEntity::find_for_user(&user)
		.filter(book_condition.clone())
		.order_by_asc(media::Column::Name)
		.limit(DEFAULT_LIMIT)
		.into_model::<OPDSPublicationEntity>()
		.all(ctx.conn.as_ref())
		.await?;
	let books_count = OPDSPublicationEntity::find_for_user(&user)
		.filter(book_condition)
		.count(ctx.conn.as_ref())
		.await?;

	let publications =
		OPDSPublication::vec_from_books(ctx.conn.as_ref(), link_finalizer.clone(), books)
			.await?;
	let books_group = OPDSFeedGroupBuilder::default()
		.metadata(
			OPDSMetadataBuilder::default()
				.title("Books".to_string())
				.pagination(Some(
					OPDSPaginationMetadataBuilder::default()
						.number_of_items(books_count)
						.items_per_page(DEFAULT_LIMIT)
						.current_page(1)
						.build()?,
				))
				.build()?,
		)
		.links(link_finalizer.finalize_all(vec![OPDSLink::Link(
				OPDSBaseLinkBuilder::default()
					.href(format!("/opds/v2.0/books/search?query={}", query.clone()))
					.rel(OPDSLinkRel::SelfLink.item())
					.build()?,
			)]))
		.publications(publications)
		.build()?;

	Ok(Json(
		OPDSFeedBuilder::default()
			.metadata(
				OPDSMetadataBuilder::default()
					.title(format!("Search - {}", query.clone()))
					.modified(OPDSMetadata::generate_modified())
					.build()?,
			)
			.links(link_finalizer.finalize_all(vec![
					OPDSBaseLinkBuilder::default()
						.href(format!("/opds/v2.0/search?query={}", query.clone()))
						.rel(OPDSLinkRel::SelfLink.item())
						.build()?.as_link(),
					OPDSBaseLinkBuilder::default()
						.href("/opds/v2.0/catalog".to_string())
						.rel(OPDSLinkRel::Start.item())
						.build()?.as_link(),
				]))
			.groups(vec![library_group, series_group, books_group])
			.build()?,
	))
}

/// A route handler which returns a feed of libraries for a user. The feed includes groups for
/// series and books in each library.
#[tracing::instrument(skip(ctx))]
async fn browse_libraries(
	State(ctx): State<AppState>,
	HostExtractor(host): HostExtractor,
	pagination: Query<OffsetPagination>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<OPDSFeed>> {
	let link_finalizer = OPDSLinkFinalizer::from(host);

	let user = req.user();

	let take = pagination.limit();

	let libraries = library::Entity::find_for_user(&user)
		.limit(take)
		.offset(pagination.offset())
		.order_by_asc(library::Column::Name)
		.all(ctx.conn.as_ref())
		.await?;
	let library_count = library::Entity::find_for_user(&user)
		.count(ctx.conn.as_ref())
		.await?;

	let series = series::Entity::find_for_user(&user)
		.limit(DEFAULT_LIMIT)
		.order_by_asc(series::Column::Name)
		.all(ctx.conn.as_ref())
		.await?;
	let series_count = series::Entity::find_for_user(&user)
		.count(ctx.conn.as_ref())
		.await?;

	let series_group = OPDSFeedGroupBuilder::default()
		.metadata(
			OPDSMetadataBuilder::default()
				.title("Series".to_string())
				.pagination(Some(
					OPDSPaginationMetadataBuilder::default()
						.number_of_items(series_count)
						.items_per_page(DEFAULT_LIMIT)
						.current_page(1)
						.build()?,
				))
				.build()?,
		)
		.links(link_finalizer.finalize_all(vec![OPDSLink::Link(
			OPDSBaseLinkBuilder::default()
				.href("/opds/v2.0/series".to_string())
				.rel(OPDSLinkRel::SelfLink.item())
				.build()?,
		)]))
		.navigation(
			series
				.into_iter()
				.map(OPDSNavigationLink::from)
				.map(|link| link.finalize(&link_finalizer))
				.collect::<Vec<OPDSNavigationLink>>(),
		)
		.build()?;

	Ok(Json(
		OPDSFeedBuilder::default()
			.metadata(
				OPDSMetadataBuilder::default()
					.title("Browse Libraries".to_string())
					.pagination(Some(
						OPDSPaginationMetadataBuilder::default()
							.number_of_items(library_count)
							.items_per_page(take)
							.current_page(1)
							.build()?,
					))
					.build()?,
			)
			.links(link_finalizer.finalize_all(vec![OPDSLink::Link(
				OPDSBaseLinkBuilder::default()
					.href("/opds/v2.0/libraries/browse".to_string())
					.rel(OPDSLinkRel::SelfLink.item())
					.build()?,
			)]))
			.navigation(
				libraries
					.into_iter()
					.map(OPDSNavigationLink::from)
					.map(|link| link.finalize(&link_finalizer))
					.collect::<Vec<OPDSNavigationLink>>(),
			)
			.groups(vec![series_group])
			.build()?,
	))
}

#[tracing::instrument(skip(ctx))]
async fn browse_library_by_id(
	State(ctx): State<AppState>,
	HostExtractor(host): HostExtractor,
	Path(id): Path<String>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<OPDSFeed>> {
	let link_finalizer = OPDSLinkFinalizer::from(host);

	let user = req.user();

	let library = library::Entity::find_for_user(&user)
		.filter(library::Column::Id.eq(id.clone()))
		.one(ctx.conn.as_ref())
		.await?
		.ok_or(APIError::NotFound("Library not found".to_string()))?;

	let library_books = OPDSPublicationEntity::find_for_user(&user)
		.filter(series::Column::LibraryId.eq(id.clone()))
		.limit(DEFAULT_LIMIT)
		.order_by_asc(media::Column::Name)
		.into_model::<OPDSPublicationEntity>()
		.all(ctx.conn.as_ref())
		.await?;
	let library_books_count = OPDSPublicationEntity::find_for_user(&user)
		.filter(series::Column::LibraryId.eq(id.clone()))
		.count(ctx.conn.as_ref())
		.await?;

	let books_group = OPDSFeedGroupBuilder::default()
		.metadata(
			OPDSMetadataBuilder::default()
				.title("Library Books - All".to_string())
				.pagination(Some(
					OPDSPaginationMetadataBuilder::default()
						.number_of_items(library_books_count)
						.items_per_page(DEFAULT_LIMIT)
						.current_page(1)
						.build()?,
				))
				.build()?,
		)
		.links(link_finalizer.finalize_all(vec![OPDSLink::Link(
			OPDSBaseLinkBuilder::default()
				.href(format!("/opds/v2.0/libraries/{id}/books"))
				.rel(OPDSLinkRel::SelfLink.item())
				.build()?,
		)]))
		.publications(
			OPDSPublication::vec_from_books(
				ctx.conn.as_ref(),
				link_finalizer.clone(),
				library_books,
			)
			.await?,
		)
		.build()?;

	let latest_library_books = OPDSPublicationEntity::find_for_user(&user)
		.filter(series::Column::LibraryId.eq(id.clone()))
		.limit(DEFAULT_LIMIT)
		.order_by_asc(media::Column::CreatedAt)
		.into_model::<OPDSPublicationEntity>()
		.all(ctx.conn.as_ref())
		.await?;
	let latest_books_group = OPDSFeedGroupBuilder::default()
		.metadata(
			OPDSMetadataBuilder::default()
				.title("Library Books - Latest".to_string())
				.pagination(Some(
					OPDSPaginationMetadataBuilder::default()
						.number_of_items(library_books_count)
						.items_per_page(DEFAULT_LIMIT)
						.current_page(1)
						.build()?,
				))
				.build()?,
		)
		.links(link_finalizer.finalize_all(vec![OPDSLink::Link(
			OPDSBaseLinkBuilder::default()
				.href(format!("/opds/v2.0/libraries/{id}/books/latest"))
				.rel(OPDSLinkRel::SelfLink.item())
				.build()?,
		)]))
		.publications(
			OPDSPublication::vec_from_books(
				ctx.conn.as_ref(),
				link_finalizer.clone(),
				latest_library_books,
			)
			.await?,
		)
		.build()?;

	let library_series = series::Entity::find_for_user(&user)
		.filter(series::Column::LibraryId.eq(id.clone()))
		.limit(DEFAULT_LIMIT)
		.order_by_asc(series::Column::Name)
		.all(ctx.conn.as_ref())
		.await?;
	let library_series_count = series::Entity::find_for_user(&user)
		.filter(series::Column::LibraryId.eq(id.clone()))
		.count(ctx.conn.as_ref())
		.await?;

	let series_group = OPDSFeedGroupBuilder::default()
		.metadata(
			OPDSMetadataBuilder::default()
				.title("Library Series".to_string())
				.pagination(Some(
					OPDSPaginationMetadataBuilder::default()
						.number_of_items(library_series_count)
						.items_per_page(DEFAULT_LIMIT)
						.current_page(1)
						.build()?,
				))
				.build()?,
		)
		// .links(vec![OPDSLink::Link(
		// 	OPDSBaseLinkBuilder::default()
		// 		.href(format!("/opds/v2.0/libraries/{id}/series"))
		// 		.rel(OPDSLinkRel::SelfLink.item()) // TODO(OPDS-V2): Not self
		// 		.build()?,
		// )])
		.navigation(
			library_series
				.into_iter()
				.map(OPDSNavigationLink::from)
				.map(|link| link.finalize(&link_finalizer))
				.collect::<Vec<OPDSNavigationLink>>(),
		)
		.build()?;

	Ok(Json(
		OPDSFeedBuilder::default()
			.metadata(OPDSMetadataBuilder::default().title(library.name).build()?)
			.links(link_finalizer.finalize_all(vec![OPDSLink::Link(
				OPDSBaseLinkBuilder::default()
					.href(format!("/opds/v2.0/libraries/{id}"))
					.rel(OPDSLinkRel::SelfLink.item())
					.build()?,
			)]))
			.groups(vec![books_group, latest_books_group, series_group])
			.build()?,
	))
}

/// A helper function to fetch books and generate an OPDS feed for a user. This is not a route
#[allow(clippy::too_many_arguments)]
async fn fetch_books_and_generate_feed<C>(
	ctx: &Ctx,
	link_finalizer: OPDSLinkFinalizer,
	for_user: &AuthUser,
	condition: Option<Condition>,
	order: (C, Order),
	pagination: OffsetPagination,
	title: &str,
	base_url: &str,
) -> APIResult<Json<OPDSFeed>>
where
	C: ColumnTrait,
{
	let take = pagination.limit();

	let order_by_entity = order.0.entity_name().deref().to_string();
	let for_user_id = for_user.id.clone();
	let books = OPDSPublicationEntity::find_for_user(for_user)
		.apply_if(condition.clone(), |query, condition| {
			query.filter(condition)
		})
		.apply_if(
			(order_by_entity == *"reading_sessions").then_some(()),
			|query, _| {
				query.filter(reading_session::Column::UserId.eq(for_user_id.clone()))
			},
		)
		.limit(take)
		.offset(pagination.offset())
		.order_by(order.0, order.1)
		.into_model::<OPDSPublicationEntity>()
		.all(ctx.conn.as_ref())
		.await?;
	let for_user_id = for_user.id.clone();
	let books_count = OPDSPublicationEntity::find_for_user(for_user)
		.apply_if(condition, |query, condition| query.filter(condition))
		.apply_if(
			(order_by_entity == *"reading_sessions").then_some(()),
			|query, _| {
				query.filter(reading_session::Column::UserId.eq(for_user_id.clone()))
			},
		)
		.count(ctx.conn.as_ref())
		.await?;
	let publications =
		OPDSPublication::vec_from_books(ctx.conn.as_ref(), link_finalizer.clone(), books)
			.await?;

	let next_page = pagination.next_page();
	let previous_link = match pagination.previous_page() {
		Some(page) => Some(
			link_finalizer.finalize(OPDSLink::Link(
				OPDSBaseLinkBuilder::default()
					.href(format!("{base_url}?page={page}"))
					.rel(OPDSLinkRel::Previous.item())
					.build()?,
			)),
		),
		None => None,
	};

	let links = link_finalizer.finalize_all(chain_optional_iter(
		[
			OPDSLink::Link(
				OPDSBaseLinkBuilder::default()
					.href(base_url.to_string())
					.rel(OPDSLinkRel::SelfLink.item())
					.build()?,
			),
			OPDSLink::Link(
				OPDSBaseLinkBuilder::default()
					.href("/opds/v2.0/books/catalog".to_string())
					.rel(OPDSLinkRel::Start.item())
					.build()?,
			),
			OPDSLink::Link(
				OPDSBaseLinkBuilder::default()
					.href(format!("{base_url}?page={next_page}"))
					.rel(OPDSLinkRel::Next.item())
					.build()?,
			),
		],
		[previous_link],
	));

	Ok(Json(
		OPDSFeedBuilder::default()
			.metadata(
				OPDSMetadataBuilder::default()
					.title(title.to_string())
					.pagination(Some(
						OPDSPaginationMetadataBuilder::default()
							.number_of_items(books_count)
							.items_per_page(take)
							.current_page(pagination.page)
							.build()?,
					))
					.build()?,
			)
			.links(links)
			.publications(publications)
			.build()?,
	))
}

/// A route handler which returns a feed of books for a library.
#[tracing::instrument(skip(ctx))]
async fn browse_library_books(
	State(ctx): State<AppState>,
	HostExtractor(host): HostExtractor,
	Path(id): Path<String>,
	pagination: Query<OffsetPagination>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<OPDSFeed>> {
	let user = req.user();

	fetch_books_and_generate_feed(
		&ctx,
		OPDSLinkFinalizer::from(host),
		&user,
		Some(Condition::all().add(series::Column::LibraryId.eq(id.clone()))),
		(media::Column::Name, Order::Asc),
		pagination.0,
		"Library Books - All",
		format!("/opds/v2.0/libraries/{id}/books").as_str(),
	)
	.await
}

#[tracing::instrument(skip(ctx))]
async fn latest_library_books(
	State(ctx): State<AppState>,
	HostExtractor(host): HostExtractor,
	Path(id): Path<String>,
	pagination: Query<OffsetPagination>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<OPDSFeed>> {
	let user = req.user();

	fetch_books_and_generate_feed(
		&ctx,
		OPDSLinkFinalizer::from(host),
		&user,
		Some(Condition::all().add(series::Column::LibraryId.eq(id.clone()))),
		(media::Column::CreatedAt, Order::Desc),
		pagination.0,
		"Library Books - Latest",
		format!("/opds/v2.0/libraries/{id}/books/latest").as_str(),
	)
	.await
}

#[tracing::instrument(skip(ctx))]
async fn browse_series(
	State(ctx): State<AppState>,
	HostExtractor(host): HostExtractor,
	pagination: Query<OffsetPagination>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<OPDSFeed>> {
	let user = req.user();

	let take = pagination.limit();
	let series = series::Entity::find_for_user(&user)
		.limit(take)
		.offset(pagination.offset())
		.order_by_asc(series::Column::Name)
		.all(ctx.conn.as_ref())
		.await?;
	let series_count = series::Entity::find_for_user(&user)
		.count(ctx.conn.as_ref())
		.await?;

	let link_finalizer = OPDSLinkFinalizer::from(host);

	Ok(Json(
		OPDSFeedBuilder::default()
			.metadata(
				OPDSMetadataBuilder::default()
					.title("Browse Series".to_string())
					.pagination(Some(
						OPDSPaginationMetadataBuilder::default()
							.number_of_items(series_count)
							.items_per_page(take)
							.current_page(pagination.page)
							.build()?,
					))
					.build()?,
			)
			.links(link_finalizer.finalize_all(vec![
				OPDSLink::Link(
					OPDSBaseLinkBuilder::default()
						.href("/opds/v2.0/series".to_string())
						.rel(OPDSLinkRel::SelfLink.item())
						.build()?,
				),
				OPDSLink::Link(
					OPDSBaseLinkBuilder::default()
						.href("/opds/v2.0/catalog".to_string())
						.rel(OPDSLinkRel::Start.item())
						.build()?,
				),
			]))
			.navigation(
				series
					.into_iter()
					.map(OPDSNavigationLink::from)
					.map(|link| link.finalize(&link_finalizer))
					.collect::<Vec<OPDSNavigationLink>>(),
			)
			.build()?,
	))
}

#[tracing::instrument(skip(ctx))]
async fn browse_series_by_id(
	State(ctx): State<AppState>,
	HostExtractor(host): HostExtractor,
	pagination: Query<OffsetPagination>,
	Path(id): Path<String>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<OPDSFeed>> {
	let user = req.user();

	let series::ModelWithMetadata { series, metadata } =
		series::ModelWithMetadata::find_for_user(&user)
			.filter(series::Column::Id.eq(id.clone()))
			.into_model::<series::ModelWithMetadata>()
			.one(ctx.conn.as_ref())
			.await?
			.ok_or(APIError::NotFound("Series not found".to_string()))?;
	let name = series.name.clone();

	let title = metadata
		.and_then(|m| m.title)
		.or(Some(name))
		.unwrap_or_else(|| format!("Series {}", id));

	fetch_books_and_generate_feed(
		&ctx,
		OPDSLinkFinalizer::from(host),
		&user,
		Some(Condition::all().add(media::Column::SeriesId.eq(id.clone()))),
		(media::Column::Name, Order::Asc),
		pagination.0,
		&title,
		&format!("/opds/v2.0/series/{id}"),
	)
	.await
}

/// A route handler which returns a feed of books for a user.
#[tracing::instrument(skip(ctx))]
async fn browse_books(
	State(ctx): State<AppState>,
	HostExtractor(host): HostExtractor,
	pagination: Query<OffsetPagination>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<OPDSFeed>> {
	let user = req.user();

	fetch_books_and_generate_feed(
		&ctx,
		OPDSLinkFinalizer::from(host),
		&user,
		None,
		(media::Column::Name, Order::Asc),
		pagination.0,
		"Browse All Books",
		"/opds/v2.0/books/browse",
	)
	.await
}

/// A route handler which returns the latest books for a user as an OPDS feed.
#[tracing::instrument(skip(ctx))]
async fn latest_books(
	State(ctx): State<AppState>,
	HostExtractor(host): HostExtractor,
	pagination: Query<OffsetPagination>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<OPDSFeed>> {
	let user = req.user();

	fetch_books_and_generate_feed(
		&ctx,
		OPDSLinkFinalizer::from(host),
		&user,
		None,
		(media::Column::CreatedAt, Order::Desc),
		pagination.0,
		"Latest Books",
		"/opds/v2.0/books/latest",
	)
	.await
}

/// A route handler which returns the books a user is currently reading. A user is currently reading
/// a book if there exists an active reading session for the user.
///
/// Completed books are not included in this feed.
#[tracing::instrument(skip(ctx))]
async fn keep_reading(
	State(ctx): State<AppState>,
	HostExtractor(host): HostExtractor,
	pagination: Query<OffsetPagination>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<OPDSFeed>> {
	let user = req.user();

	fetch_books_and_generate_feed(
		&ctx,
		OPDSLinkFinalizer::from(host),
		&user,
		Some(
			Condition::all()
				.add(reading_session::Column::UserId.eq(user.id.clone()))
				.add(
					Condition::any()
						.add(reading_session::Column::Page.gt(0))
						.add(reading_session::Column::Epubcfi.is_not_null()),
				),
		),
		(reading_session::Column::UpdatedAt, Order::Desc),
		pagination.0,
		"Currently Reading",
		"/opds/v2.0/books/keep-reading",
	)
	.await
}

/// A helper function to fetch a book page for a user. This is not a route handler.
async fn fetch_book_page_for_user(
	ctx: &Ctx,
	user: &AuthUser,
	book_id: String,
	page: i32,
) -> APIResult<ImageResponse> {
	let book = media::Entity::find_for_user(user)
		.columns(vec![media::Column::Id, media::Column::Path])
		.filter(media::Column::Id.eq(book_id))
		.into_model::<media::MediaIdentSelect>()
		.one(ctx.conn.as_ref())
		.await?
		.ok_or(APIError::NotFound("Book not found".to_string()))?;

	let (content_type, image_buffer) =
		get_page_async(PathBuf::from(book.path), page, &ctx.config).await?;
	Ok(ImageResponse::new(content_type, image_buffer))
}

#[tracing::instrument(skip(ctx))]
async fn get_book_by_id(
	Path(id): Path<String>,
	HostExtractor(host): HostExtractor,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<OPDSPublication>> {
	let book = OPDSPublicationEntity::find_for_user(&req.user())
		.filter(media::Column::Id.eq(id.clone()))
		.into_model::<OPDSPublicationEntity>()
		.one(ctx.conn.as_ref())
		.await?
		.ok_or(APIError::NotFound("Book not found".to_string()))?;

	Ok(Json(
		OPDSPublication::from_book(
			ctx.conn.as_ref(),
			OPDSLinkFinalizer::from(host),
			book,
		)
		.await?,
	))
}

/// A route handler which returns a book thumbnail for a user as a valid image response.
#[tracing::instrument(skip(ctx))]
async fn get_book_thumbnail(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<ImageResponse> {
	let (content_type, image_buffer) =
		get_media_thumbnail_by_id(&ctx, &req.user(), id).await?;
	Ok(ImageResponse::new(content_type, image_buffer))
}

/// A route handler which returns a single page of a book for a user as a valid image
/// response.
#[tracing::instrument(skip(ctx))]
async fn get_book_page(
	Path((id, page)): Path<(String, i32)>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<ImageResponse> {
	fetch_book_page_for_user(&ctx, &req.user(), id, page).await
}

// // .route("/chapter/{chapter}", get(get_epub_chapter))
// // .route("/{root}/{resource}", get(get_epub_meta)),
// // async fn get_book_resource() {}

/// A route handler which returns the progression of a book for a user.
#[tracing::instrument(skip(ctx))]
async fn get_book_progression(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	HostExtractor(host): HostExtractor,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<OPDSProgression>> {
	let link_finalizer = OPDSLinkFinalizer::from(host);

	let user = req.user();

	let active_reading_session = OPDSProgressionEntity::find()
		.filter(
			reading_session::Column::UserId
				.eq(user.id.clone())
				.and(reading_session::Column::MediaId.eq(id.clone())),
		)
		.filter(
			Condition::any()
				.add(reading_session::Column::Page.gt(0))
				.add(reading_session::Column::Epubcfi.is_not_null()),
		)
		.into_model::<OPDSProgressionEntity>()
		.one(ctx.conn.as_ref())
		.await?;

	let Some(reading_session) = active_reading_session else {
		return Ok(Json(OPDSProgression::default()));
	};

	Ok(Json(OPDSProgression::new(reading_session, link_finalizer)?))
}

/// A route handler which downloads a book for a user.
#[tracing::instrument(skip(ctx))]
async fn download_book(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<NamedFile> {
	let user = req
		.user_and_enforce_permissions(&[UserPermission::DownloadFile])
		.map_err(|_| {
			tracing::error!("User does not have permission to download file");
			APIError::forbidden_discreet()
		})?;

	let book = media::Entity::find_for_user(&user)
		.filter(media::Column::Id.eq(id.clone()))
		.into_model::<media::MediaIdentSelect>()
		.one(ctx.conn.as_ref())
		.await?
		.ok_or(APIError::NotFound("Book not found".to_string()))?;

	Ok(NamedFile::open(book.path.clone()).await?)
}
