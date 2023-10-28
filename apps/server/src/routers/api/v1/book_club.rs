use axum::{
	extract::{Path, State},
	middleware::from_extractor_with_state,
	routing::{get, post, put},
	Json, Router,
};
use prisma_client_rust::{
	and,
	chrono::{Duration, Utc},
	or, Direction,
};
use serde::Deserialize;
use serde_qs::axum::QsQuery;
use specta::Type;
use stump_core::{
	db::entity::{
		book_club_member_and_schedule_include, book_club_with_books_include,
		book_club_with_schedule, BookClub, BookClubBook, BookClubInvitation,
		BookClubMember, BookClubMemberRole, BookClubMemberRoleSpec, BookClubSchedule,
		User, UserPermission,
	},
	prisma::{
		book_club, book_club_book, book_club_invitation, book_club_member,
		book_club_schedule, media, user, PrismaClient,
	},
};
use tower_sessions::Session;
use utoipa::ToSchema;

use crate::{
	config::state::AppState,
	errors::{ApiError, ApiResult},
	middleware::auth::{Auth, BookClubGuard},
	utils::{
		chain_optional_iter, get_session_server_owner_user, get_session_user,
		get_user_and_enforce_permission, safe_string_to_date, string_to_date,
	},
};

// TODO: suggestions
// TODO: suggestion likes
// TODO: update schedule
// TODO: patch schedule
// TODO: check members can access the books in the schedule. I don't think lack of access should necessarily
// be an error, but it would definitely be a warning for admins/creator
// TODO: users that are members but have the feature revoked need some reconcilation...

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.route("/book-clubs", get(get_book_clubs).post(create_book_club))
		.nest(
			"/book-clubs/:id",
			Router::new()
				.route("/", get(get_book_club).put(update_book_club))
				.route("/current-book", get(get_book_club_current_book))
				.nest(
					"/invitations",
					Router::new()
						.route(
							"/",
							get(get_book_club_invitations)
								.post(create_book_club_invitation),
						)
						.route("/:id", put(respond_to_book_club_invitation)),
				)
				.nest(
					"/members",
					Router::new()
						.route(
							"/",
							get(get_book_club_members)
								.post(create_book_club_member_handler),
						)
						.route(
							"/:id",
							get(get_book_club_member)
								.put(update_book_club_member)
								.delete(delete_book_club_member),
						),
				)
				.nest(
					"/schedule",
					Router::new()
						.route(
							"/",
							get(get_book_club_schedule).post(create_book_club_schedule),
						)
						.route("/add", post(add_books_to_book_club_schedule)),
				),
		)
		.layer(from_extractor_with_state::<BookClubGuard, AppState>(
			app_state.clone(),
		))
		.layer(from_extractor_with_state::<Auth, AppState>(app_state))
}

/// A function to generate access control conditionals on book clubs for a given user. In
/// general, anyone can access _information_ about a non-private book club, e.g. name and non-private
/// members. However, only members can access the schedule and books.
pub(crate) fn book_club_access_for_user(user: &User) -> Vec<book_club::WhereParam> {
	chain_optional_iter(
		[],
		// server owner can see all book clubs
		[(!user.is_server_owner).then(|| {
			// a user can see a book club if they are a member or if it is not private
			or![
				book_club::members::some(vec![book_club_member::user_id::equals(
					user.id.clone(),
				)]),
				book_club::is_private::equals(false),
			]
		})],
	)
}

/// A function to assert that a user has a given role in a book club (or higher)
pub(crate) fn book_club_member_permission_for_user(
	user: &User,
	role: BookClubMemberRole,
) -> Vec<book_club_member::WhereParam> {
	chain_optional_iter(
		[],
		[(!user.is_server_owner).then(|| book_club_member::role::gte(role.into()))],
	)
}

/// A function to generate access control conditionals on book club members for a given user
pub(crate) fn book_club_member_access_for_user(
	user: &User,
) -> Vec<book_club_member::WhereParam> {
	chain_optional_iter(
		[],
		// server owner can see all members
		[(!user.is_server_owner).then(|| {
			or![
				// if the user is a member, they can see all members
				book_club_member::book_club::is(vec![book_club::members::some(vec![
					book_club_member::user_id::equals(user.id.clone(),)
				])]),
				// if the user is not a member, they can only see non-private members
				and![
					book_club_member::private_membership::equals(false),
					book_club_member::book_club::is(vec![
						book_club::members::none(vec![
							book_club_member::user_id::equals(user.id.clone())
						]),
						book_club::is_private::equals(false)
					])
				],
			]
		})],
	)
}

#[derive(Deserialize, Type, ToSchema)]
pub struct GetBookClubsParams {
	#[serde(default)]
	all: bool,
}

#[utoipa::path(
	get,
	path = "/api/v1/book_clubs",
	tag = "book_club",
	responses(
		(status = 200, description = "Successfully retrieved book clubs", body = Vec<BookClub>),
		(status = 401, description = "Unauthorized"),
		(status = 500, description = "Internal server error")
	)
)]
async fn get_book_clubs(
	State(ctx): State<AppState>,
	QsQuery(params): QsQuery<GetBookClubsParams>,
	session: Session,
) -> ApiResult<Json<Vec<BookClub>>> {
	let client = ctx.get_db();
	let viewer = get_session_user(&session)?;

	let where_params = if params.all {
		vec![book_club::members::some(vec![
			book_club_member::user_id::equals(viewer.id.clone()),
		])]
	} else {
		book_club_access_for_user(&viewer)
	};

	let book_clubs = client
		.book_club()
		.find_many(where_params)
		.include(book_club_member_and_schedule_include::include(
			book_club_member_access_for_user(&viewer),
		))
		.exec()
		.await?;

	Ok(Json(book_clubs.into_iter().map(BookClub::from).collect()))
}

#[derive(Deserialize, Type, ToSchema)]
pub struct CreateBookClub {
	pub name: String,
	#[serde(default)]
	pub is_private: bool,
	pub member_role_spec: Option<BookClubMemberRoleSpec>,

	#[serde(default)]
	pub creator_hide_progress: bool,
	pub creator_display_name: Option<String>,
}

#[utoipa::path(
    post,
    path = "/api/v1/book_clubs",
    tag = "book_club",
    responses(
        (status = 200, description = "Successfully created book club", body = BookClub),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    )
)]
async fn create_book_club(
	State(ctx): State<AppState>,
	session: Session,
	Json(payload): Json<CreateBookClub>,
) -> ApiResult<Json<BookClub>> {
	let db = ctx.get_db();

	let viewer =
		get_user_and_enforce_permission(&session, UserPermission::CreateBookClub)?;

	// TODO: refactor when nested create is supported
	let (book_club, _) = db
		._transaction()
		.run(|client| async move {
			let book_club = client
				.book_club()
				.create(
					payload.name,
					vec![
						book_club::is_private::set(payload.is_private),
						book_club::member_role_spec::set(
							payload.member_role_spec.map(Into::into),
						),
					],
				)
				.exec()
				.await?;

			client
				.book_club_member()
				.create(
					payload.creator_hide_progress,
					BookClubMemberRole::CREATOR.into(),
					user::id::equals(viewer.id),
					book_club::id::equals(book_club.id.clone()),
					vec![
						book_club_member::is_creator::set(true),
						book_club_member::display_name::set(payload.creator_display_name),
					],
				)
				.exec()
				.await
				.map(|created_member| (book_club, created_member))
		})
		.await?;

	Ok(Json(BookClub::from(book_club)))
}

#[utoipa::path(
    get,
    path = "/api/v1/book_clubs/:id",
    tag = "book_club",
    responses(
        (status = 200, description = "Successfully retrieved book club", body = BookClub),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    )
)]
async fn get_book_club(
	State(ctx): State<AppState>,
	Path(id): Path<String>,
	session: Session,
) -> ApiResult<Json<BookClub>> {
	let client = ctx.get_db();
	let viewer = get_session_user(&session)?;

	let where_params = book_club_access_for_user(&viewer)
		.into_iter()
		.chain([book_club::id::equals(id)])
		.collect();

	let book_club = client
		.book_club()
		.find_first(where_params)
		.include(book_club_with_books_include::include(
			book_club_member_access_for_user(&viewer),
		))
		.exec()
		.await?
		.ok_or(ApiError::NotFound("Book club not found".to_string()))?;

	Ok(Json(BookClub::from(book_club)))
}

#[derive(Deserialize, Type, ToSchema)]
pub struct UpdateBookClub {
	pub name: Option<String>,
	pub description: Option<String>,
	pub is_private: Option<bool>,
	pub member_role_spec: Option<BookClubMemberRoleSpec>,
}

#[utoipa::path(
    put,
    path = "/api/v1/book_clubs/:id",
    tag = "book_club",
    responses(
        (status = 200, description = "Successfully patched book club", body = BookClub),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    )
)]
async fn update_book_club(
	State(ctx): State<AppState>,
	Path(id): Path<String>,
	session: Session,
	Json(payload): Json<UpdateBookClub>,
) -> ApiResult<Json<BookClub>> {
	let client = ctx.get_db();

	let viewer = get_session_user(&session)?;

	// Query first for access control. Realistically, I could `update_many` with the
	// access assertions, but I would have to requery for the book afterwards anyways
	let book_club = client
		.book_club()
		.find_first(vec![
			book_club::id::equals(id),
			book_club::members::some(book_club_member_permission_for_user(
				&viewer,
				BookClubMemberRole::ADMIN,
			)),
		])
		.exec()
		.await?
		.ok_or(ApiError::NotFound("Book club not found".to_string()))?;

	let updated_book_club = client
		.book_club()
		.update(
			book_club::id::equals(book_club.id),
			chain_optional_iter(
				[book_club::description::set(payload.description)],
				[
					payload.name.map(book_club::name::set),
					payload.is_private.map(book_club::is_private::set),
					payload
						.member_role_spec
						.map(|spec| book_club::member_role_spec::set(Some(spec.into()))),
				],
			),
		)
		.exec()
		.await?;

	Ok(Json(BookClub::from(updated_book_club)))
}

#[derive(Deserialize, Type, ToSchema)]
pub struct UpdateBookClubSchedule {}

async fn get_book_club_invitations() -> ApiResult<Json<Vec<BookClubInvitation>>> {
	Err(ApiError::NotImplemented)
}

#[derive(Deserialize, Type, ToSchema)]
pub struct CreateBookClubInvitation {
	pub user_id: String,
	pub role: Option<BookClubMemberRole>,
}

async fn create_book_club_invitation(
	State(ctx): State<AppState>,
	Path(id): Path<String>,
	session: Session,
	Json(payload): Json<CreateBookClubInvitation>,
) -> ApiResult<Json<BookClubInvitation>> {
	let client = ctx.get_db();
	let viewer = get_session_user(&session)?;

	// I don't check for access control before the query because I am enforcing it when
	// I query for the book club. This way, if the user doesn't have access, they will
	// get a 404 instead of a 403.
	let book_club = client
		.book_club()
		.find_first(vec![
			book_club::id::equals(id),
			book_club::members::some(book_club_member_permission_for_user(
				&viewer,
				BookClubMemberRole::ADMIN,
			)),
		])
		.exec()
		.await?
		.ok_or(ApiError::NotFound("Book club not found".to_string()))?;

	let invalid_role = payload
		.role
		.as_ref()
		.map(|role| *role == BookClubMemberRole::CREATOR)
		.unwrap_or(false);

	if invalid_role {
		return Err(ApiError::BadRequest("Cannot invite a creator".to_string()));
	} else if payload.user_id == viewer.id {
		return Err(ApiError::BadRequest(
			"Cannot invite yourself a book club you are already a member of".to_string(),
		));
	}

	let invitation = client
		.book_club_invitation()
		.create(
			user::id::equals(payload.user_id),
			book_club::id::equals(book_club.id),
			chain_optional_iter(
				[],
				[payload
					.role
					.map(|role| book_club_invitation::role::set(role.into()))],
			),
		)
		.exec()
		.await?;

	Ok(Json(BookClubInvitation::from(invitation)))
}

#[utoipa::path(
    get,
    path = "/api/v1/book_clubs/:id/members",
    tag = "book_club",
    responses(
        (status = 200, description = "Successfully retrieved book club members", body = Vec<BookClubMember>),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    )
)]
async fn get_book_club_members(
	State(ctx): State<AppState>,
	Path(id): Path<String>,
	session: Session,
) -> ApiResult<Json<Vec<BookClubMember>>> {
	let client = ctx.get_db();

	let viewer = get_session_user(&session)?;

	let where_params = book_club_member_access_for_user(&viewer)
		.into_iter()
		.chain([book_club_member::book_club::is(vec![
			book_club::id::equals(id),
		])])
		.collect();

	let book_club_members = client
		.book_club_member()
		.find_many(where_params)
		.exec()
		.await?;

	Ok(Json(
		book_club_members
			.into_iter()
			.map(BookClubMember::from)
			.collect(),
	))
}

#[derive(Deserialize, Type, ToSchema, Default)]
pub struct CreateBookClubMember {
	pub user_id: String,
	pub display_name: Option<String>,
	pub private_membership: Option<bool>,
}

async fn create_book_club_member(
	input: CreateBookClubMember,
	book_club_id: String,
	client: &PrismaClient,
) -> ApiResult<BookClubMember> {
	let created_member = client
		.book_club_member()
		.create(
			input.private_membership.unwrap_or(false),
			BookClubMemberRole::MEMBER.into(),
			user::id::equals(input.user_id),
			book_club::id::equals(book_club_id),
			vec![book_club_member::display_name::set(input.display_name)],
		)
		.exec()
		.await?;

	Ok(BookClubMember::from(created_member))
}

#[derive(Deserialize, Type, ToSchema)]
pub struct BookClubInvitationAnswer {
	pub accept: bool,
	pub member_details: Option<CreateBookClubMember>,
}

#[utoipa::path(
    post,
    path = "/api/v1/book_clubs/:id/invitations/:invitation_id",
    tag = "book_club",
    responses(
        (status = 200, description = "Successfully responded to book club invitation", body = Option<BookClubMember>),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    )
)]
async fn respond_to_book_club_invitation(
	State(ctx): State<AppState>,
	Path((id, invitation_id)): Path<(String, String)>,
	session: Session,
	Json(payload): Json<BookClubInvitationAnswer>,
) -> ApiResult<Json<Option<BookClubMember>>> {
	let client = ctx.get_db();

	let viewer = get_session_user(&session)?;

	let invitation = client
		.book_club_invitation()
		.find_first(vec![
			book_club_invitation::id::equals(invitation_id),
			book_club_invitation::book_club_id::equals(id),
			book_club_invitation::user_id::equals(viewer.id.clone()),
		])
		.exec()
		.await?
		.ok_or(ApiError::NotFound("Invitation not found".to_string()))?;

	if payload.accept {
		let input = payload.member_details.unwrap_or(CreateBookClubMember {
			user_id: viewer.id,
			..Default::default()
		});

		let created_member =
			create_book_club_member(input, invitation.book_club_id, client).await?;

		client
			.book_club_invitation()
			.delete(book_club_invitation::id::equals(invitation.id))
			.exec()
			.await?;

		Ok(Json(Some(created_member)))
	} else {
		client
			.book_club_invitation()
			.delete(book_club_invitation::id::equals(invitation.id))
			.exec()
			.await?;

		Ok(Json(None))
	}
}

#[utoipa::path(
    post,
    path = "/api/v1/book_clubs/:id/members",
    tag = "book_club",
    responses(
        (status = 200, description = "Successfully created book club member", body = BookClubMember),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    )
)]
async fn create_book_club_member_handler(
	State(ctx): State<AppState>,
	Path(id): Path<String>,
	session: Session,
	Json(payload): Json<CreateBookClubMember>,
) -> ApiResult<Json<BookClubMember>> {
	get_session_server_owner_user(&session)?;
	let client = ctx.get_db();
	let created_member = create_book_club_member(payload, id, client).await?;
	Ok(Json(created_member))
}

#[utoipa::path(
    get,
    path = "/api/v1/book_clubs/:id/members/:member_id",
    tag = "book_club",
    responses(
        (status = 200, description = "Successfully retrieved book club member", body = BookClubMember),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    )
)]
async fn get_book_club_member(
	State(ctx): State<AppState>,
	Path((id, member_id)): Path<(String, String)>,
	session: Session,
) -> ApiResult<Json<BookClubMember>> {
	let client = ctx.get_db();

	let viewer = get_session_user(&session)?;

	let where_params = book_club_member_access_for_user(&viewer)
		.into_iter()
		.chain([
			book_club_member::book_club_id::equals(id),
			book_club_member::user_id::equals(member_id),
		])
		.collect();

	let book_club_member = client
		.book_club_member()
		.find_first(where_params)
		.exec()
		.await?
		.ok_or(ApiError::NotFound("Book club member not found".to_string()))?;

	Ok(Json(BookClubMember::from(book_club_member)))
}

#[derive(Deserialize, Type, ToSchema)]
pub struct UpdateBookClubMember {
	pub display_name: Option<String>,
	pub private_membership: Option<bool>,
}

#[utoipa::path(
    put,
    path = "/api/v1/book_clubs/:id/members/:member_id",
    tag = "book_club",
    responses(
        (status = 200, description = "Successfully updated book club member", body = BookClubMember),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    )
)]
async fn update_book_club_member(
	State(ctx): State<AppState>,
	Path((_id, member_id)): Path<(String, String)>,
	session: Session,
	Json(payload): Json<UpdateBookClubMember>,
) -> ApiResult<Json<BookClubMember>> {
	let client = ctx.get_db();

	let viewer = get_session_user(&session)?;

	if viewer.id != member_id && !viewer.is_server_owner {
		return Err(ApiError::Forbidden(
			"Cannot patch a book club member other than yourself".to_string(),
		));
	}

	let updated_member = client
		.book_club_member()
		.update(
			book_club_member::id::equals(member_id),
			chain_optional_iter(
				[book_club_member::display_name::set(payload.display_name)],
				[payload
					.private_membership
					.map(book_club_member::private_membership::set)],
			),
		)
		.exec()
		.await?;

	Ok(Json(BookClubMember::from(updated_member)))
}

async fn delete_book_club_member(
	State(ctx): State<AppState>,
	Path((id, member_id)): Path<(String, String)>,
	session: Session,
) -> ApiResult<Json<BookClubMember>> {
	let client = ctx.get_db();

	let viewer = get_session_user(&session)?;
	let viewer_membership = client
		.book_club_member()
		.find_first(vec![
			book_club_member::book_club_id::equals(id),
			book_club_member::user_id::equals(viewer.id),
			book_club_member::role::gte(BookClubMemberRole::ADMIN.into()),
		])
		.exec()
		.await?;

	let can_remove_member = viewer_membership.is_some() || viewer.is_server_owner;
	if !can_remove_member {
		return Err(ApiError::Forbidden("Insufficient privileges".to_string()));
	}

	let deleted_member = client
		.book_club_member()
		.delete(book_club_member::id::equals(member_id))
		.exec()
		.await?;

	Ok(Json(BookClubMember::from(deleted_member)))
}

/// An enum to represent the two options for a book in a book club schedule:
///
/// - A book that is stored in the database
/// - A book that is not stored in the database
///
/// This provides some flexibility for book clubs to add books that perhaps are not on the server
#[derive(Deserialize, Type, ToSchema)]
#[serde(untagged)]
pub enum CreateBookClubScheduleBookOption {
	/// A book that is stored in the database
	Stored { id: String },
	/// A book that is not stored in the database
	External {
		title: String,
		author: String,
		url: Option<String>,
	},
}

impl CreateBookClubScheduleBookOption {
	/// Convert the option into a vector of Prisma set parameters
	pub fn into_prisma(self) -> Vec<book_club_book::SetParam> {
		match self {
			CreateBookClubScheduleBookOption::Stored { id } => {
				vec![
					book_club_book::book_entity::connect(media::id::equals(id.clone())),
					book_club_book::book_entity_id::set(Some(id)),
				]
			},
			CreateBookClubScheduleBookOption::External { title, author, url } => vec![
				book_club_book::title::set(Some(title)),
				book_club_book::author::set(Some(author)),
				book_club_book::url::set(url),
			],
		}
	}
}

#[derive(Deserialize, Type, ToSchema)]
pub struct CreateBookClubScheduleBook {
	pub book: CreateBookClubScheduleBookOption,
	pub start_at: Option<String>,
	pub end_at: Option<String>,
	pub discussion_duration_days: Option<i32>,
}

#[derive(Deserialize, Type, ToSchema)]
pub struct CreateBookClubSchedule {
	pub default_interval_days: Option<i32>,
	pub books: Vec<CreateBookClubScheduleBook>,
}

// TODO: validate that the books are properly ordered, e.g. start_at < end_at and order is sequential
// An example bad request might be:
// { order: 1, start_at: "2021-05-01", end_at: "2021-05-02" }, { order: 2, start_at: "2021-01-03", end_at: "2021-01-04" }
// The second book should have a start_at date after the end_at date of the first book
#[utoipa::path(
    post,
    path = "/api/v1/book_clubs/:id/schedule",
    tag = "book_club",
    responses(
        (status = 200, description = "Successfully created book club schedule", body = BookClubSchedule),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    )
)]
async fn create_book_club_schedule(
	State(ctx): State<AppState>,
	Path(id): Path<String>,
	session: Session,
	Json(payload): Json<CreateBookClubSchedule>,
) -> ApiResult<Json<BookClubSchedule>> {
	let client = ctx.get_db();

	let viewer = get_session_user(&session)?;

	let book_club = client
		.book_club()
		.find_first(vec![
			book_club::id::equals(id),
			book_club::members::some(book_club_member_permission_for_user(
				&viewer,
				BookClubMemberRole::ADMIN,
			)),
		])
		.exec()
		.await?
		.ok_or(ApiError::NotFound("Book club not found".to_string()))?;

	let interval_days = payload.default_interval_days.unwrap_or(30);
	let books_to_create = payload.books;

	let result = client
		._transaction()
		.run(|tx| async move {
			let created_schedule = tx
				.book_club_schedule()
				.create(
					book_club::id::equals(book_club.id),
					vec![book_club_schedule::default_interval_days::set(
						payload.default_interval_days,
					)],
				)
				.exec()
				.await?;

			let mut last_end_at = None;

			let create_books_query = books_to_create.into_iter().map(|book| {
				let CreateBookClubScheduleBook {
					book,
					start_at: start_at_str,
					end_at: end_at_str,
					discussion_duration_days,
				} = book;

				let (start_at, end_at) = match (start_at_str, end_at_str) {
					(Some(start_at), Some(end_at)) => {
						(safe_string_to_date(start_at), safe_string_to_date(end_at))
					},
					(Some(start_at), None) => {
						let start_at = safe_string_to_date(start_at);
						(start_at, start_at + Duration::days(interval_days as i64))
					},
					(None, Some(end_at)) => {
						let end_at = safe_string_to_date(end_at);
						(end_at - Duration::days(interval_days as i64), end_at)
					},
					(None, None) => {
						let start_at = if let Some(last_end_at) = last_end_at {
							last_end_at
						} else {
							Utc::now()
						};

						(start_at, start_at + Duration::days(interval_days as i64))
					},
				};

				last_end_at = Some(end_at);

				let set_params = vec![book_club_book::discussion_duration_days::set(
					discussion_duration_days,
				)]
				.into_iter()
				.chain(book.into_prisma())
				.collect();

				tx.book_club_book()
					.create(start_at.into(), end_at.into(), set_params)
			});

			tx._batch(create_books_query)
				.await
				.map(|books| (created_schedule, books))
		})
		.await?;

	Ok(Json(BookClubSchedule::from(result)))
}

#[utoipa::path(
    get,
    path = "/api/v1/book_clubs/:id/schedule",
    tag = "book_club",
    responses(
        (status = 200, description = "Successfully retrieved book club schedule", body = BookClubSchedule),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    )
)]
async fn get_book_club_schedule(
	State(ctx): State<AppState>,
	Path(id): Path<String>,
	session: Session,
) -> ApiResult<Json<BookClubSchedule>> {
	let client = ctx.get_db();

	let viewer = get_session_user(&session)?;

	// TODO: not fully correct, not sure if non-members should be able to query for this when
	// targeting public book clubs
	let where_params = book_club_access_for_user(&viewer)
		.into_iter()
		.chain([book_club::id::equals(id)])
		.collect();

	let book_club_schedule = client
		.book_club_schedule()
		.find_first(vec![book_club_schedule::book_club::is(where_params)])
		.with(
			book_club_schedule::books::fetch(vec![])
				.order_by(book_club_book::start_at::order(Direction::Asc)),
		)
		.exec()
		.await?
		.ok_or(ApiError::NotFound(
			"Book club schedule not found".to_string(),
		))?;

	Ok(Json(BookClubSchedule::from(book_club_schedule)))
}

#[derive(Deserialize, Type, ToSchema)]
pub struct AddBooksToBookClubSchedule {
	pub books: Vec<CreateBookClubScheduleBook>,
}

async fn add_books_to_book_club_schedule(
	State(ctx): State<AppState>,
	Path(id): Path<String>,
	session: Session,
	Json(payload): Json<AddBooksToBookClubSchedule>,
) -> ApiResult<Json<Vec<BookClubBook>>> {
	let client = ctx.get_db();

	let viewer = get_session_user(&session)?;

	let book_club = client
		.book_club()
		.find_first(vec![
			book_club::id::equals(id),
			book_club::members::some(book_club_member_permission_for_user(
				&viewer,
				BookClubMemberRole::ADMIN,
			)),
		])
		.include(book_club_with_schedule::include())
		.exec()
		.await?
		.ok_or(ApiError::NotFound("Book club not found".to_string()))?;
	let schedule = book_club.schedule.ok_or(ApiError::NotFound(
		"Book club schedule not found".to_string(),
	))?;

	let existing_books = client
		.book_club_book()
		.find_many(vec![
			book_club_book::book_club_schedule_book_club_id::equals(Some(book_club.id)),
		])
		.order_by(book_club_book::start_at::order(Direction::Asc))
		.exec()
		.await?;

	let books_to_add = payload.books;
	if books_to_add.is_empty() {
		return Err(ApiError::BadRequest(
			"Cannot add an empty list of books".to_string(),
		));
	}

	let last_existing_book = existing_books.last().ok_or(
		ApiError::InternalServerError("Could not find last existing book".to_string()),
	)?;
	let last_existing_book_end_at_str = last_existing_book.end_at.to_rfc3339();
	let last_existing_book_end_at =
		string_to_date(last_existing_book_end_at_str.clone())?;

	let has_collision = books_to_add.iter().any(|book| {
		let start_at = safe_string_to_date(
			book.start_at
				.clone()
				.unwrap_or(last_existing_book_end_at_str.clone()),
		);
		start_at < last_existing_book_end_at
	});
	if has_collision {
		return Err(ApiError::BadRequest(
			"Cannot add books that have a start date before the last book's end date"
				.to_string(),
		));
	}

	let interval_days = schedule.default_interval_days.unwrap_or(30);
	let mut last_end_at = Some(last_existing_book_end_at);
	let create_many_query = books_to_add.into_iter().map(|book| {
		let CreateBookClubScheduleBook {
			book,
			start_at: start_at_str,
			end_at: end_at_str,
			discussion_duration_days,
		} = book;

		let (start_at, end_at) = match (start_at_str, end_at_str) {
			(Some(start_at), Some(end_at)) => {
				(safe_string_to_date(start_at), safe_string_to_date(end_at))
			},
			(Some(start_at), None) => {
				let start_at = safe_string_to_date(start_at);
				(start_at, start_at + Duration::days(interval_days as i64))
			},
			(None, Some(end_at)) => {
				let end_at = safe_string_to_date(end_at);
				(end_at - Duration::days(interval_days as i64), end_at)
			},
			(None, None) => {
				let start_at = if let Some(last_end_at) = last_end_at {
					last_end_at
				} else {
					Utc::now()
				};

				(start_at, start_at + Duration::days(interval_days as i64))
			},
		};

		last_end_at = Some(end_at);

		let set_params = vec![book_club_book::discussion_duration_days::set(
			discussion_duration_days,
		)]
		.into_iter()
		.chain(book.into_prisma())
		.collect();

		client
			.book_club_book()
			.create(start_at.into(), end_at.into(), set_params)
	});

	let created_books = client._batch(create_many_query).await?;

	Ok(Json(
		created_books.into_iter().map(BookClubBook::from).collect(),
	))
}

#[utoipa::path(
    get,
    path = "/api/v1/book_clubs/:id/schedule/current-book",
    tag = "book_club",
    responses(
        (status = 200, description = "Successfully retrieved book club current book", body = BookClubBook),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    )
)]
async fn get_book_club_current_book(
	State(ctx): State<AppState>,
	Path(id): Path<String>,
	session: Session,
) -> ApiResult<Json<BookClubBook>> {
	let client = ctx.get_db();

	let viewer = get_session_user(&session)?;

	let where_params = book_club_access_for_user(&viewer)
		.into_iter()
		.chain([book_club::id::equals(id)])
		.collect();

	let book_club_schedule = client
		.book_club_schedule()
		.find_first(vec![book_club_schedule::book_club::is(where_params)])
		.with(
			book_club_schedule::books::fetch(vec![book_club_book::end_at::gte(
				Utc::now().into(),
			)])
			.order_by(book_club_book::start_at::order(Direction::Asc)),
		)
		.exec()
		.await?
		.ok_or(ApiError::NotFound(
			"Book club schedule not found".to_string(),
		))?;

	let current_book = book_club_schedule
		.books
		.ok_or(ApiError::NotFound(
			"Book club schedule has no books".to_string(),
		))?
		.first()
		.cloned()
		.ok_or(ApiError::NotFound(
			"Book club schedule has no books".to_string(),
		))?;

	Ok(Json(BookClubBook::from(current_book)))
}
