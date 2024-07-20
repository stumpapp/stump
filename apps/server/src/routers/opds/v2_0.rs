use axum::{
	extract::{Path, Query, State},
	middleware::from_extractor_with_state,
	routing::get,
	Json, Router,
};
use prisma_client_rust::{and, operator, Direction};
use stump_core::{
	db::{
		entity::{
			macros::media_path_select,
			utils::{
				apply_media_age_restriction,
				apply_media_library_not_hidden_for_user_filter,
			},
			User, UserPermission,
		},
		query::pagination::PageQuery,
	},
	filesystem::media::get_page,
	opds::v2_0::{
		authentication::{
			OPDSAuthenticationDocument, OPDSAuthenticationDocumentBuilder,
			OPDSSupportedAuthFlow,
		},
		books_as_publications,
		feed::{OPDSFeed, OPDSFeedBuilder},
		group::OPDSFeedGroupBuilder,
		link::{
			OPDSBaseLinkBuilder, OPDSLink, OPDSLinkRel, OPDSNavigationLink,
			OPDSNavigationLinkBuilder,
		},
		metadata::{OPDSMetadata, OPDSMetadataBuilder, OPDSPaginationMetadataBuilder},
		publication::OPDSPublication,
	},
	prisma::{library, media, series},
	Ctx,
};
use tower_sessions::Session;

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	filter::chain_optional_iter,
	middleware::{auth::Auth, host::HostExtractor},
	routers::{
		api::v1::{
			library::library_not_hidden_from_user_filter,
			media::{
				apply_in_progress_filter_for_user, apply_media_restrictions_for_user,
			},
			series::apply_series_restrictions_for_user,
		},
		relative_favicon_path,
	},
	utils::{
		enforce_session_permissions, get_session_user,
		http::{ImageResponse, NamedFile},
	},
};

const DEFAULT_LIMIT: i64 = 10;

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.nest(
			"/v2.0",
			Router::new()
				.route("/auth", get(auth))
				.route("/catalog", get(catalog))
				.nest(
					"/libraries",
					Router::new().route("/", get(browse_libraries)).nest(
						"/:id",
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
					Router::new()
						.route("/", get(browse_series))
						.nest("/:id", Router::new().route("/", get(browse_series_by_id))),
				)
				// TODO(311): Support smart list feeds
				// .nest("/smart-lists", Router::new())
				.nest(
					"/books",
					Router::new()
						.route("/browse", get(browse_books))
						.route("/latest", get(latest_books))
						.route("/keep-reading", get(keep_reading))
						.nest(
							"/:id",
							Router::new()
								.route("/", get(get_book_by_id))
								.route("/thumbnail", get(get_book_thumbnail))
								.route("/pages/:page", get(get_book_page))
								.route("/file", get(download_book)),
						),
				),
		)
		.layer(from_extractor_with_state::<Auth, AppState>(app_state))
}

async fn auth(
	HostExtractor(host): HostExtractor,
) -> APIResult<Json<OPDSAuthenticationDocument>> {
	Ok(Json(
		OPDSAuthenticationDocumentBuilder::default()
			.description(OPDSSupportedAuthFlow::Basic.description().to_string())
			.links(vec![
				OPDSLink::help(),
				OPDSLink::logo(format!("{}{}", host.url(), relative_favicon_path())),
			])
			.build()?,
	))
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
				.collect::<Vec<OPDSNavigationLink>>(),
		)
		.build()?;

	let latest_books_conditions = apply_media_restrictions_for_user(&user);
	let latest_books = client
		.media()
		.find_many(latest_books_conditions.clone())
		.take(DEFAULT_LIMIT)
		.order_by(media::created_at::order(Direction::Desc))
		.include(books_as_publications::include())
		.exec()
		.await?;
	let latest_books_count = client.media().count(latest_books_conditions).exec().await?;
	let publications = OPDSPublication::vec_from_books(&ctx.db, latest_books).await?;
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
		.links(vec![OPDSLink::Link(
			OPDSBaseLinkBuilder::default()
				.href("/opds/v2.0/books/latest".to_string())
				.rel(OPDSLinkRel::SelfLink.item())
				.build()?,
		)])
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
			.groups(vec![library_group, latest_books_group])
			.build()?,
	))
}

/// A route handler which returns a feed of libraries for a user. The feed includes groups for
/// series and books in each library.
async fn browse_libraries(
	State(ctx): State<AppState>,
	pagination: Query<PageQuery>,
	session: Session,
) -> APIResult<Json<OPDSFeed>> {
	let client = &ctx.db;

	let user = get_session_user(&session)?;

	let (skip, take) = pagination.get_skip_take();
	let library_conditions = vec![library_not_hidden_from_user_filter(&user)];
	let libraries = client
		.library()
		.find_many(library_conditions.clone())
		.take(take)
		.skip(skip)
		.exec()
		.await?;
	let library_count = client.library().count(library_conditions).exec().await?;

	let series_conditions = apply_series_restrictions_for_user(&user);
	let series = client
		.series()
		.find_many(series_conditions.clone())
		.take(DEFAULT_LIMIT)
		.order_by(series::name::order(Direction::Asc))
		.exec()
		.await?;
	let series_count = client.series().count(series_conditions).exec().await?;
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
		.links(vec![OPDSLink::Link(
			OPDSBaseLinkBuilder::default()
				.href("/opds/v2.0/series".to_string())
				.rel(OPDSLinkRel::SelfLink.item())
				.build()?,
		)])
		.navigation(
			series
				.into_iter()
				.map(OPDSNavigationLink::from)
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
			.links(vec![OPDSLink::Link(
				OPDSBaseLinkBuilder::default()
					.href("/opds/v2.0/libraries/browse".to_string())
					.rel(OPDSLinkRel::SelfLink.item())
					.build()?,
			)])
			.navigation(
				libraries
					.into_iter()
					.map(OPDSNavigationLink::from)
					.collect::<Vec<OPDSNavigationLink>>(),
			)
			.groups(vec![series_group])
			.build()?,
	))
}

async fn browse_library_by_id(
	State(ctx): State<AppState>,
	Path(id): Path<String>,
	session: Session,
) -> APIResult<Json<OPDSFeed>> {
	let client = &ctx.db;

	let user = get_session_user(&session)?;

	let library_conditions = vec![
		library_not_hidden_from_user_filter(&user),
		library::id::equals(id.clone()),
	];
	let library = client
		.library()
		.find_first(library_conditions.clone())
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Library not found")))?;

	let library_books_conditions = vec![
		operator::and(apply_media_restrictions_for_user(&user)),
		media::series::is(vec![series::library_id::equals(Some(id.clone()))]),
	];
	let library_books = client
		.media()
		.find_many(library_books_conditions.clone())
		.take(DEFAULT_LIMIT)
		.order_by(media::created_at::order(Direction::Desc))
		.include(books_as_publications::include())
		.exec()
		.await?;
	let library_books_count = client
		.media()
		.count(library_books_conditions.clone())
		.exec()
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
		.links(vec![OPDSLink::Link(
			OPDSBaseLinkBuilder::default()
				.href(format!("/opds/v2.0/libraries/{id}/books"))
				.rel(OPDSLinkRel::SelfLink.item())
				.build()?,
		)])
		.publications(OPDSPublication::vec_from_books(&ctx.db, library_books).await?)
		.build()?;

	let latest_library_books = client
		.media()
		.find_many(library_books_conditions.clone())
		.take(DEFAULT_LIMIT)
		.order_by(media::created_at::order(Direction::Desc))
		.include(books_as_publications::include())
		.exec()
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
		.links(vec![OPDSLink::Link(
			OPDSBaseLinkBuilder::default()
				.href(format!("/opds/v2.0/libraries/{id}/books/latest"))
				.rel(OPDSLinkRel::SelfLink.item())
				.build()?,
		)])
		.publications(
			OPDSPublication::vec_from_books(&ctx.db, latest_library_books).await?,
		)
		.build()?;

	let library_series_conditions = vec![
		operator::and(apply_series_restrictions_for_user(&user)),
		series::library_id::equals(Some(id.clone())),
	];
	let library_series = client
		.series()
		.find_many(library_series_conditions.clone())
		.take(DEFAULT_LIMIT)
		.order_by(series::name::order(Direction::Asc))
		.exec()
		.await?;
	let library_series_count = client
		.series()
		.count(library_series_conditions)
		.exec()
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
		// 		.rel(OPDSLinkRel::SelfLink.item()) // TODO(311): Not self
		// 		.build()?,
		// )])
		.navigation(
			library_series
				.into_iter()
				.map(OPDSNavigationLink::from)
				.collect::<Vec<OPDSNavigationLink>>(),
		)
		.build()?;

	Ok(Json(
		OPDSFeedBuilder::default()
			.metadata(
				OPDSMetadataBuilder::default()
					.title(library.name.to_string())
					.build()?,
			)
			.links(vec![OPDSLink::Link(
				OPDSBaseLinkBuilder::default()
					.href(format!("/opds/v2.0/libraries/{id}"))
					.rel(OPDSLinkRel::SelfLink.item())
					.build()?,
			)])
			.groups(vec![books_group, latest_books_group, series_group])
			.build()?,
	))
}

/// A helper function to fetch books and generate an OPDS feed for a user. This is not a route
async fn fetch_books_and_generate_feed(
	ctx: &Ctx,
	for_user: &User,
	where_params: Vec<media::WhereParam>,
	order: media::OrderByParam,
	pagination: PageQuery,
	title: &str,
	base_url: &str,
) -> APIResult<Json<OPDSFeed>> {
	let client = &ctx.db;

	let (skip, take) = pagination.get_skip_take();

	let restrictions = apply_media_restrictions_for_user(for_user);

	let where_params = if where_params.is_empty() {
		restrictions
	} else {
		let restrictions = operator::and(restrictions);
		vec![and![restrictions, operator::and(where_params)]]
	};

	let books = client
		.media()
		.find_many(where_params.clone())
		.take(take)
		.order_by(order)
		.skip(skip)
		.include(books_as_publications::include())
		.exec()
		.await?;
	let books_count = client.media().count(where_params).exec().await?;
	let publications = OPDSPublication::vec_from_books(client, books).await?;

	let next_page = pagination.get_next_page();
	let previous_link = if let Some(page) = pagination.page {
		Some(OPDSLink::Link(
			OPDSBaseLinkBuilder::default()
				.href(format!("{base_url}?page={page}"))
				.rel(OPDSLinkRel::Previous.item())
				.build()?,
		))
	} else {
		None
	};

	let links = chain_optional_iter(
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
	);

	Ok(Json(
		OPDSFeedBuilder::default()
			.metadata(
				OPDSMetadataBuilder::default()
					.title(title.to_string())
					.pagination(Some(
						OPDSPaginationMetadataBuilder::default()
							.number_of_items(books_count)
							.items_per_page(take)
							.current_page(pagination.page.map(|p| p as i64).unwrap_or(1))
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
async fn browse_library_books(
	State(ctx): State<AppState>,
	Path(id): Path<String>,
	pagination: Query<PageQuery>,
	session: Session,
) -> APIResult<Json<OPDSFeed>> {
	let user = get_session_user(&session)?;

	fetch_books_and_generate_feed(
		&ctx,
		&user,
		vec![media::series::is(vec![series::library_id::equals(Some(
			id.clone(),
		))])],
		media::name::order(Direction::Asc),
		pagination.0,
		"Library Books - All",
		format!("/opds/v2.0/libraries/{id}/books").as_str(),
	)
	.await
}

async fn latest_library_books(
	State(ctx): State<AppState>,
	Path(id): Path<String>,
	pagination: Query<PageQuery>,
	session: Session,
) -> APIResult<Json<OPDSFeed>> {
	let user = get_session_user(&session)?;

	fetch_books_and_generate_feed(
		&ctx,
		&user,
		vec![media::series::is(vec![series::library_id::equals(Some(
			id.clone(),
		))])],
		media::created_at::order(Direction::Desc),
		pagination.0,
		"Library Books - Latest",
		format!("/opds/v2.0/libraries/{id}/books/latest").as_str(),
	)
	.await
}

async fn browse_series(
	State(ctx): State<AppState>,
	pagination: Query<PageQuery>,
	session: Session,
) -> APIResult<Json<OPDSFeed>> {
	let client = &ctx.db;
	let user = get_session_user(&session)?;

	let (skip, take) = pagination.get_skip_take();
	let series_conditions = apply_series_restrictions_for_user(&user);
	let series = client
		.series()
		.find_many(series_conditions.clone())
		.take(take)
		.skip(skip)
		.order_by(series::name::order(Direction::Asc))
		.exec()
		.await?;
	let series_count = client.series().count(series_conditions).exec().await?;

	let current_page = (pagination.zero_indexed_page() + 1) as i64;

	Ok(Json(
		OPDSFeedBuilder::default()
			.metadata(
				OPDSMetadataBuilder::default()
					.title("Browse Series".to_string())
					.pagination(Some(
						OPDSPaginationMetadataBuilder::default()
							.number_of_items(series_count)
							.items_per_page(take)
							.current_page(current_page)
							.build()?,
					))
					.build()?,
			)
			.links(vec![
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
			])
			.navigation(
				series
					.into_iter()
					.map(OPDSNavigationLink::from)
					.collect::<Vec<OPDSNavigationLink>>(),
			)
			.build()?,
	))
}

async fn browse_series_by_id(
	State(ctx): State<AppState>,
	pagination: Query<PageQuery>,
	Path(id): Path<String>,
	session: Session,
) -> APIResult<Json<OPDSFeed>> {
	let user = get_session_user(&session)?;

	fetch_books_and_generate_feed(
		&ctx,
		&user,
		vec![media::series_id::equals(Some(id.clone()))],
		media::name::order(Direction::Asc),
		pagination.0,
		"All Series",
		&format!("/opds/v2.0/series/{id}"),
	)
	.await
}

/// A route handler which returns a feed of books for a user.
async fn browse_books(
	State(ctx): State<AppState>,
	pagination: Query<PageQuery>,
	session: Session,
) -> APIResult<Json<OPDSFeed>> {
	let user = get_session_user(&session)?;

	fetch_books_and_generate_feed(
		&ctx,
		&user,
		vec![],
		media::name::order(Direction::Asc),
		pagination.0,
		"Browse All Books",
		"/opds/v2.0/books/browse",
	)
	.await
}

/// A route handler which returns the latest books for a user as an OPDS feed.
async fn latest_books(
	State(ctx): State<AppState>,
	pagination: Query<PageQuery>,
	session: Session,
) -> APIResult<Json<OPDSFeed>> {
	let user = get_session_user(&session)?;

	fetch_books_and_generate_feed(
		&ctx,
		&user,
		vec![],
		media::created_at::order(Direction::Desc),
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
async fn keep_reading(
	State(ctx): State<AppState>,
	pagination: Query<PageQuery>,
	session: Session,
) -> APIResult<Json<OPDSFeed>> {
	let user = get_session_user(&session)?;

	fetch_books_and_generate_feed(
		&ctx,
		&user,
		vec![media::active_user_reading_sessions::some(vec![
			apply_in_progress_filter_for_user(user.id.clone()),
		])],
		media::created_at::order(Direction::Desc),
		pagination.0,
		"Currently Reading",
		"/opds/v2.0/books/keep-reading",
	)
	.await
}

/// A helper function to fetch a book page for a user. This is not a route handler.
async fn fetch_book_page_for_user(
	ctx: &Ctx,
	user: &User,
	book_id: String,
	page: i32,
) -> APIResult<ImageResponse> {
	let client = &ctx.db;

	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
	// Combined conditions which assert:
	// - The book is the one we're looking for
	// - The book is not hidden from the user via the library
	// - The book is not restricted by age
	let where_params = chain_optional_iter(
		[media::id::equals(book_id)]
			.into_iter()
			.chain(apply_media_library_not_hidden_for_user_filter(user))
			.collect::<Vec<media::WhereParam>>(),
		[age_restrictions],
	);

	let book = client
		.media()
		.find_first(where_params)
		// Only select the path, since we're going to read the file directly and do
		// absolutely nothing else with the media record
		.select(media_path_select::select())
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Book not found")))?;

	let (content_type, image_buffer) = get_page(book.path.as_str(), page, &ctx.config)?;
	Ok(ImageResponse::new(content_type, image_buffer))
}

async fn get_book_by_id(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: Session,
) -> APIResult<Json<OPDSPublication>> {
	unimplemented!()
}

/// A route handler which returns a book thumbnail for a user as a valid image response.
async fn get_book_thumbnail(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: Session,
) -> APIResult<ImageResponse> {
	fetch_book_page_for_user(&ctx, &get_session_user(&session)?, id, 1).await
}

/// A route handler which returns a single page of a book for a user as a valid image
/// response.
async fn get_book_page(
	Path((id, page)): Path<(String, i32)>,
	State(ctx): State<AppState>,
	session: Session,
) -> APIResult<ImageResponse> {
	fetch_book_page_for_user(&ctx, &get_session_user(&session)?, id, page).await
}

/// A route handler which downloads a book for a user.
async fn download_book(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: Session,
) -> APIResult<NamedFile> {
	let db = &ctx.db;

	let user = enforce_session_permissions(&session, &[UserPermission::DownloadFile])?;
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
	let where_params = chain_optional_iter(
		[media::id::equals(id)]
			.into_iter()
			.chain(apply_media_library_not_hidden_for_user_filter(&user))
			.collect::<Vec<media::WhereParam>>(),
		[age_restrictions],
	);

	let book = db
		.media()
		.find_first(where_params)
		.select(media_path_select::select())
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Book not found")))?;

	Ok(NamedFile::open(book.path.clone()).await?)
}
