use axum::{
	extract::State, middleware::from_extractor_with_state, routing::get, Json, Router,
};
use stump_core::opds::v2_0::{
	feed::{OPDSFeed, OPDSFeedBuilder},
	group::OPDSFeedGroupBuilder,
	link::{
		OPDSBaseLinkBuilder, OPDSLink, OPDSLinkRel, OPDSNavigationLink,
		OPDSNavigationLinkBuilder,
	},
	metadata::{OPDSMetadata, OPDSMetadataBuilder, OPDSPaginationMetadataBuilder},
};
use tower_sessions::Session;

use crate::{
	config::state::AppState, errors::APIResult, middleware::auth::Auth,
	routers::api::v1::library::library_not_hidden_from_user_filter,
	utils::get_session_user,
};

// .route("/keep-reading", get(keep_reading))
// .nest(
// 	"/libraries",
// 	Router::new()
// 		.route("/", get(get_libraries))
// 		.route("/:id", get(get_library_by_id)),
// )
// .nest(
// 	"/series",
// 	Router::new()
// 		.route("/", get(get_series))
// 		.route("/latest", get(get_latest_series))
// 		.route("/:id", get(get_series_by_id)),
// )
// .nest(
// 	"/books/:id",
// 	Router::new()
// 		.route("/thumbnail", get(get_book_thumbnail))
// 		.route("/pages/:page", get(get_book_page))
// 		.route("/file/:filename", get(download_book)),
// ),

// TODO: determine if all of these links can still be relative. If not, that's
// a little tricky...

const DEFAULT_LIMIT: i64 = 10;

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.nest("/v2.0", Router::new().route("/catalog", get(catalog)))
		.layer(from_extractor_with_state::<Auth, AppState>(app_state))
}

async fn catalog(
	State(ctx): State<AppState>,
	session: Session,
) -> APIResult<Json<OPDSFeed>> {
	let client = &ctx.db;

	let user = get_session_user(&session)?;

	let library_conditions = vec![library_not_hidden_from_user_filter(&user)];
	let libraries = client
		.library()
		.find_many(library_conditions.clone())
		.take(DEFAULT_LIMIT)
		.exec()
		.await?;
	let library_count = client.library().count(library_conditions).exec().await?;
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
		.links(vec![OPDSLink::Link(
			OPDSBaseLinkBuilder::default()
				.href("/opds/v2.0/libraries".to_string())
				.rel(OPDSLinkRel::SelfLink.item())
				.build()?,
		)])
		.navigation(
			libraries
				.into_iter()
				.map(OPDSNavigationLink::from)
				.collect(),
		)
		.build()?;

	Ok(Json(
		OPDSFeedBuilder::default()
			.metadata(
				OPDSMetadataBuilder::default()
					.title("Stump OPDS V2 Catalog".to_string())
					.modified(OPDSMetadata::generate_modified())
					.build()?,
			)
			.links(vec![OPDSLink::Link(
				OPDSBaseLinkBuilder::default()
					.href("/opds/v2.0/catalog".to_string())
					.build()?,
			)])
			.navigation(vec![OPDSNavigationLinkBuilder::default()
				.title("Libraries".to_string())
				.base_link(
					OPDSBaseLinkBuilder::default()
						.href("/opds/v2.0/libraries".to_string())
						.rel(OPDSLinkRel::Subsection.item())
						.build()?,
				)
				.build()?])
			.groups(vec![library_group])
			.build()?,
	))
}
