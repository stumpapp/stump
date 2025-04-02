use async_graphql::{Context, Object, Result, ID};
use chrono::{DateTime, Duration, FixedOffset, Utc};
use models::{
	entity::{
		book_club, book_club_book, book_club_invitation, book_club_member,
		book_club_schedule, user::AuthUser,
	},
	shared::{
		book_club::{
			BookClubBook, BookClubExternalBook, BookClubInternalBook, BookClubMemberRole,
		},
		enums::UserPermission,
	},
};
use sea_orm::{prelude::*, IntoActiveModel, Set, TransactionTrait};

use crate::{
	data::{CoreContext, RequestContext},
	guard::PermissionGuard,
	input::book_club::{
		BookClubInvitationInput, BookClubInvitationResponseInput,
		BookClubInvitationResponseValidator, BookClubMemberInput, CreateBookClubInput,
		CreateBookClubMemberInput, CreateBookClubScheduleBook,
		CreateBookClubScheduleInput, UpdateBookClubInput,
	},
	object::{
		book_club::BookClub, book_club_invitation::BookClubInvitation,
		book_club_member::BookClubMember,
	},
};

#[derive(Default)]
pub struct BookClubMutation;

// TODO: consider separate mutation objects for the different parts of the book club?

#[Object]
impl BookClubMutation {
	#[graphql(guard = "PermissionGuard::one(UserPermission::CreateBookClub)")]
	async fn create_book_club(
		&self,
		ctx: &Context<'_>,
		input: CreateBookClubInput,
	) -> Result<BookClub> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let txn = conn.begin().await?;

		let (club, member) = input.into_active_model(user);

		let created_club = club.insert(&txn).await?;
		let _created_member = member.insert(&txn).await?;

		txn.commit().await?;

		Ok(created_club.into())
	}

	async fn update_book_club(
		&self,
		ctx: &Context<'_>,
		id: ID,
		input: UpdateBookClubInput,
	) -> Result<BookClub> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let book_club = book_club::Entity::find_for_member_enforce_role_and_id(
			user,
			BookClubMemberRole::Admin,
			&id.to_string(),
		)
		.one(conn)
		.await?
		.ok_or("Book club not found or you lack permission to update")?;

		let active_model = input.apply(book_club.into_active_model());
		let updated_club = active_model.update(conn).await?;
		Ok(updated_club.into())
	}

	async fn create_book_club_invitation(
		&self,
		ctx: &Context<'_>,
		id: ID,
		input: BookClubInvitationInput,
	) -> Result<BookClubInvitation> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		validate_book_club_invitation_input(user, &id, &input, conn).await?;

		let created_invitation = create_invitation_active_model(&id, &input)
			.insert(conn)
			.await?;

		Ok(created_invitation.into())
	}

	async fn respond_to_book_club_invitation(
		&self,
		ctx: &Context<'_>,
		id: ID,
		#[graphql(validator(custom = "BookClubInvitationResponseValidator"))]
		input: BookClubInvitationResponseInput,
	) -> Result<BookClubInvitation> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		Ok(handle_book_club_invitation(user, &id, input, conn)
			.await?
			.into())
	}

	async fn create_book_club_member(
		&self,
		ctx: &Context<'_>,
		book_club_id: ID,
		input: CreateBookClubMemberInput,
	) -> Result<BookClubMember> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let created_member = input
			.into_active_model(&book_club_id.to_string())
			.insert(conn)
			.await?;

		Ok(BookClubMember::from(created_member))
	}

	async fn create_book_club_schedule(
		&self,
		ctx: &Context<'_>,
		id: ID,
		input: CreateBookClubScheduleInput,
	) -> Result<BookClub> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let book_club = get_book_club_for_admin(user, &id, conn)
			.await?
			.ok_or("Book club not found or you lack permission to create schedule")?;

		let interval_days = input.default_interval_days.unwrap_or(30);
		let books_to_create = input.books;

		create_book_club_books(&id, interval_days, books_to_create, conn).await?;

		Ok(book_club.into())
	}

	async fn add_books_to_book_club_schedule(
		&self,
		ctx: &Context<'_>,
		id: ID,
		#[graphql(validator(min_items = 1))] books: Vec<CreateBookClubScheduleBook>,
	) -> Result<BookClub> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let book_club = get_book_club_for_admin(user, &id, conn)
			.await?
			.ok_or("Book club not found or you lack permission to adjust the schedule")?;

		let schedule = book_club_schedule::Entity::find_for_book_club_id(&id.to_string())
			.one(conn)
			.await?
			.ok_or("Schedule not found")?;
		let existing_books = book_club_book::Entity::find_with_schedule_for_book_club_id(
			&id.to_string(),
			Utc::now().into(),
		)
		.all(conn)
		.await?;

		let mut last_end_at = existing_books.last().map(|book| book.end_at);

		let active_models = books
			.into_iter()
			.map(|book| create_book_active_model(&schedule, &mut last_end_at, book))
			.collect::<Vec<_>>();

		book_club_book::Entity::insert_many(active_models)
			.exec(conn)
			.await?;

		Ok(book_club.into())
	}
}

async fn get_book_club_for_admin(
	user: &AuthUser,
	id: &ID,
	conn: &DatabaseConnection,
) -> Result<Option<book_club::Model>> {
	Ok(book_club::Entity::find_for_member_enforce_role_and_id(
		user,
		BookClubMemberRole::Admin,
		&id.to_string(),
	)
	.one(conn)
	.await?)
}

async fn create_book_club_books(
	id: &ID,
	interval_days: i32,
	books_to_create: Vec<CreateBookClubScheduleBook>,
	conn: &DatabaseConnection,
) -> Result<()> {
	let txn = conn.begin().await?;

	let created_schedule = book_club_schedule::ActiveModel {
		book_club_id: Set(id.to_string()),
		default_interval_days: Set(Some(interval_days)),
		..Default::default()
	}
	.insert(&txn)
	.await?;

	let mut last_end_at = None;

	let active_models = books_to_create
		.into_iter()
		.map(|book| create_book_active_model(&created_schedule, &mut last_end_at, book))
		.collect::<Vec<_>>();

	book_club_book::Entity::insert_many(active_models)
		.exec(&txn)
		.await?;

	txn.commit().await?;
	Ok(())
}

async fn validate_book_club_invitation_input(
	user: &AuthUser,
	id: &ID,
	input: &BookClubInvitationInput,
	conn: &DatabaseConnection,
) -> Result<()> {
	let _book_club = book_club::Entity::find_for_member_enforce_role_and_id(
		user,
		BookClubMemberRole::Admin,
		&id.to_string(),
	)
	.one(conn)
	.await?
	.ok_or("Book club not found or you lack permission to update")?;

	let invalid_role = input
		.role
		.as_ref()
		.is_some_and(|role| *role == BookClubMemberRole::Creator);

	if invalid_role {
		return Err("Cannot invite a user as a creator".into());
	}

	if input.user_id == user.id {
		return Err("Cannot create an invitation for yourself".into());
	}

	Ok(())
}

async fn handle_book_club_invitation(
	user: &AuthUser,
	id: &ID,
	input: BookClubInvitationResponseInput,
	conn: &DatabaseConnection,
) -> Result<book_club_invitation::Model> {
	let invitation = get_book_club_invitation(&user, &id, conn).await?;

	Ok(if !input.accept {
		decline_invitation(invitation, conn).await?
	} else {
		accept_invitation(user, invitation, input.member, conn).await?
	})
}

async fn get_book_club_invitation(
	user: &AuthUser,
	id: &ID,
	conn: &DatabaseConnection,
) -> Result<book_club_invitation::Model> {
	Ok(
		book_club_invitation::Entity::find_for_user_and_id(user, &id.to_string())
			.one(conn)
			.await?
			.ok_or("Invitation not found")?,
	)
}

async fn decline_invitation(
	invitation: book_club_invitation::Model,
	conn: &DatabaseConnection,
) -> Result<book_club_invitation::Model> {
	// TODO: soft delete?
	invitation.clone().delete(conn).await?;
	return Ok(invitation);
}

async fn accept_invitation(
	user: &AuthUser,
	invitation: book_club_invitation::Model,
	input: Option<BookClubMemberInput>,
	conn: &DatabaseConnection,
) -> Result<book_club_invitation::Model> {
	// Note: We should never hit this branch because the validator should catch this.
	// Otherwise, the delete branch above would require another invite to be sent.
	let member_input = input.ok_or("Accepting an invitation requires a member object")?;

	let member = create_member_active_model(user, &invitation, member_input);
	let _created_member = member.insert(conn).await?;
	// TODO: soft delete?
	invitation.clone().delete(conn).await?;

	Ok(invitation)
}

fn create_member_active_model(
	user: &AuthUser,
	invitation: &book_club_invitation::Model,
	input: BookClubMemberInput,
) -> book_club_member::ActiveModel {
	book_club_member::ActiveModel {
		display_name: Set(input.display_name),
		private_membership: Set(input.private_membership.unwrap_or(false)),
		user_id: Set(user.id.clone()),
		book_club_id: Set(invitation.book_club_id.clone()),
		role: Set(invitation.role),
		is_creator: Set(false),
		..Default::default()
	}
}

fn create_invitation_active_model(
	id: &ID,
	input: &BookClubInvitationInput,
) -> book_club_invitation::ActiveModel {
	book_club_invitation::ActiveModel {
		role: Set(input.role.unwrap_or(BookClubMemberRole::Member)),
		user_id: Set(input.user_id.clone()),
		book_club_id: Set(id.to_string()),
		..Default::default()
	}
}

fn create_book_active_model(
	schedule: &book_club_schedule::Model,
	last_end_at: &mut Option<DateTime<FixedOffset>>,
	input: CreateBookClubScheduleBook,
) -> book_club_book::ActiveModel {
	let CreateBookClubScheduleBook {
		book,
		start_at,
		end_at,
		discussion_duration_days,
	} = input;

	let interval_days = schedule.default_interval_days.unwrap_or(30);

	let (start_at, end_at) =
		get_next_start_end_at(*last_end_at, interval_days, start_at, end_at);
	*last_end_at = Some(end_at);

	match book {
		BookClubBook::Stored(BookClubInternalBook { id }) => {
			book_club_book::ActiveModel {
				id: Set(Uuid::new_v4().to_string()),
				start_at: Set(start_at),
				end_at: Set(end_at),
				discussion_duration_days: Set(discussion_duration_days),
				book_entity_id: Set(Some(id)),
				book_club_schedule_id: Set(Some(schedule.id)),
				..Default::default()
			}
		},
		BookClubBook::External(BookClubExternalBook {
			title,
			author,
			url,
			image_url,
		}) => book_club_book::ActiveModel {
			id: Set(Uuid::new_v4().to_string()),
			start_at: Set(start_at),
			end_at: Set(end_at),
			discussion_duration_days: Set(discussion_duration_days),
			title: Set(Some(title)),
			author: Set(Some(author)),
			url: Set(url),
			image_url: Set(image_url),
			book_club_schedule_id: Set(Some(schedule.id)),
			..Default::default()
		},
	}
}

fn get_next_start_end_at(
	last_end_at: Option<DateTime<FixedOffset>>,
	interval_days: i32,
	start_at: Option<DateTime<FixedOffset>>,
	end_at: Option<DateTime<FixedOffset>>,
) -> (DateTime<FixedOffset>, DateTime<FixedOffset>) {
	match (start_at, end_at) {
		(Some(start_at), Some(end_at)) => (start_at, end_at),
		(Some(start_at), None) => (
			start_at,
			start_at + Duration::days(i64::from(interval_days)),
		),
		(None, Some(end_at)) => {
			(end_at - Duration::days(i64::from(interval_days)), end_at)
		},
		(None, None) => {
			let start_at = if let Some(last_end_at) = last_end_at {
				last_end_at
			} else {
				Utc::now().into()
			};
			(
				start_at,
				start_at + Duration::days(i64::from(interval_days)),
			)
		},
	}
}

#[cfg(test)]
mod tests {
	use crate::tests::common::*;

	use super::*;
	use chrono::{DateTime, FixedOffset};
	use pretty_assertions::assert_eq;
	use sea_orm::{ActiveValue::NotSet, TryIntoModel};

	fn get_default_book_club() -> book_club::Model {
		book_club::Model {
			id: "123".to_string(),
			name: "Test".to_string(),
			description: None,
			is_private: false,
			member_role_spec: None,
			created_at: chrono::Utc::now().into(),
			emoji: None,
		}
	}

	fn get_default_book_club_invitation() -> book_club_invitation::Model {
		book_club_invitation::Model {
			id: "314".to_string(),
			role: BookClubMemberRole::Admin,
			user_id: "42".to_string(),
			book_club_id: "123".to_string(),
		}
	}

	#[tokio::test]
	async fn decline_book_club_invitation_no_member() {
		let user = get_default_user();
		let id: ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa".into();
		let member = BookClubMemberInput {
			user_id: "42".to_string(),
			display_name: None,
			private_membership: None,
		};
		let input = BookClubInvitationResponseInput {
			accept: false,
			member: Some(member),
		};

		let book_club_invitation = get_default_book_club_invitation();
		let mock_db = get_mock_db_for_model(vec![book_club_invitation.clone()])
			.append_exec_results(vec![sea_orm::MockExecResult {
				last_insert_id: 0,
				rows_affected: 1,
			}])
			.into_connection();
		let result = handle_book_club_invitation(&user, &id, input, &mock_db).await;
		assert!(result.is_ok());
	}

	#[tokio::test]
	async fn accept_book_club_invitation_no_member() {
		let user = get_default_user();
		let id: ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa".into();
		let member = BookClubMemberInput {
			user_id: "42".to_string(),
			display_name: None,
			private_membership: None,
		};

		let input = BookClubInvitationResponseInput {
			accept: true,
			member: Some(member.clone()),
		};

		let invitation = get_default_book_club_invitation();
		let mut member_active_model =
			create_member_active_model(&user, &invitation, member);
		member_active_model.id = Set("1".to_string());
		member_active_model.hide_progress = Set(false);
		let member_model = member_active_model.try_into_model().unwrap();
		let mock_db = get_mock_db_for_model(vec![invitation.clone()])
			.append_query_results(vec![vec![member_model]])
			.append_exec_results(vec![sea_orm::MockExecResult {
				last_insert_id: 1,
				rows_affected: 1,
			}])
			.into_connection();
		let result = handle_book_club_invitation(&user, &id, input, &mock_db).await;
		assert!(result.is_ok());
	}

	#[tokio::test]
	async fn test_get_book_club_invitation() {
		let book_club_invitation = get_default_book_club_invitation();
		let mock_db =
			get_mock_db_for_model(vec![book_club_invitation.clone()]).into_connection();
		let id: ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa".into();

		// check for successful result
		let result = get_book_club_invitation(&get_default_user(), &id, &mock_db)
			.await
			.unwrap();
		assert_eq!(result, book_club_invitation);

		// check for empty result
		let mock_db = get_mock_db_for_model::<book_club_invitation::Model>(vec![])
			.into_connection();
		let result = get_book_club_invitation(&get_default_user(), &id, &mock_db).await;
		assert!(result.is_err());
	}

	#[tokio::test]
	async fn test_validate_book_club_invitation_input_valid() {
		let mock_db =
			get_mock_db_for_model(vec![get_default_book_club()]).into_connection();

		let input = BookClubInvitationInput {
			role: Some(BookClubMemberRole::Admin),
			user_id: "456".to_string(),
		};

		let result = validate_book_club_invitation_input(
			&get_default_user(),
			&"123".into(),
			&input,
			&mock_db,
		)
		.await;

		assert!(result.is_ok());
	}

	#[tokio::test]
	async fn test_validate_book_club_invitation_input_same_user() {
		let mock_db: DatabaseConnection =
			get_mock_db_for_model(vec![get_default_book_club()]).into_connection();
		let input: BookClubInvitationInput = BookClubInvitationInput {
			role: Some(BookClubMemberRole::Admin),
			user_id: get_default_user().id,
		};
		let result = validate_book_club_invitation_input(
			&get_default_user(),
			&"123".into(),
			&input,
			&mock_db,
		)
		.await;

		assert!(result.is_err());
	}

	#[tokio::test]
	async fn test_validate_book_club_invitation_input_missing_role() {
		let mock_db: DatabaseConnection =
			get_mock_db_for_model(vec![get_default_book_club()]).into_connection();
		let input: BookClubInvitationInput = BookClubInvitationInput {
			role: None,
			user_id: "456".to_string(),
		};
		let result = validate_book_club_invitation_input(
			&get_default_user(),
			&"123".into(),
			&input,
			&mock_db,
		)
		.await;
		assert!(result.is_ok());
	}

	#[tokio::test]
	async fn test_validate_book_club_invitation_input_invalid_role() {
		let mock_db: DatabaseConnection =
			get_mock_db_for_model(vec![get_default_book_club()]).into_connection();
		let input: BookClubInvitationInput = BookClubInvitationInput {
			role: Some(BookClubMemberRole::Creator),
			user_id: "456".to_string(),
		};
		let result = validate_book_club_invitation_input(
			&get_default_user(),
			&"123".into(),
			&input,
			&mock_db,
		)
		.await;
		assert!(result.is_err());
	}

	#[tokio::test]
	async fn test_validate_book_club_invitation_input_invalid_user() {
		let user = get_default_user();
		let mock_db: DatabaseConnection =
			get_mock_db_for_model(vec![get_default_book_club()]).into_connection();
		let input: BookClubInvitationInput = BookClubInvitationInput {
			role: Some(BookClubMemberRole::Creator),
			user_id: user.id.clone(),
		};
		let result =
			validate_book_club_invitation_input(&user, &"123".into(), &input, &mock_db)
				.await;
		assert!(result.is_err());
	}

	#[test]
	fn test_create_invitation_active_model() {
		let id: ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa".into();
		let input = BookClubInvitationInput {
			role: Some(BookClubMemberRole::Admin),
			user_id: "456".to_string(),
		};

		let active_model = create_invitation_active_model(&id, &input);

		assert_eq!(active_model.role.unwrap(), BookClubMemberRole::Admin);
		assert_eq!(active_model.user_id.unwrap(), "456".to_string());
		assert_eq!(active_model.book_club_id.unwrap(), id.to_string());
	}

	#[test]
	fn test_create_book_active_model_stored() {
		let schedule = book_club_schedule::Model {
			id: 314,
			book_club_id: "123".to_string(),
			default_interval_days: Some(30),
		};
		let mut last_end_at = None;
		let input = CreateBookClubScheduleBook {
			book: BookClubBook::Stored(BookClubInternalBook {
				id: "456".to_string(),
			}),
			start_at: None,
			end_at: None,
			discussion_duration_days: None,
		};

		let active_model = create_book_active_model(&schedule, &mut last_end_at, input);

		assert_eq!(
			active_model.book_entity_id.unwrap().unwrap(),
			"456".to_string()
		);
		assert_eq!(active_model.book_club_schedule_id.unwrap().unwrap(), 314);
		assert!(!active_model.id.unwrap().is_empty());
		assert_eq!(active_model.author, NotSet);
	}

	#[test]
	fn test_create_book_active_model_external() {
		let schedule = book_club_schedule::Model {
			id: 314,
			book_club_id: "123".to_string(),
			default_interval_days: Some(30),
		};
		let mut last_end_at = None;
		let input = CreateBookClubScheduleBook {
			book: BookClubBook::External(BookClubExternalBook {
				title: "Lord of the Rings".to_string(),
				author: "J. R. R. Tolkien".to_string(),
				url: None,
				image_url: None,
			}),
			start_at: None,
			end_at: None,
			discussion_duration_days: None,
		};

		let active_model = create_book_active_model(&schedule, &mut last_end_at, input);

		assert_eq!(active_model.book_entity_id, NotSet);
		assert_eq!(active_model.book_club_schedule_id.unwrap().unwrap(), 314);
		assert!(!active_model.id.unwrap().is_empty());
		assert_eq!(
			active_model.author.unwrap().unwrap(),
			"J. R. R. Tolkien".to_string()
		);
	}

	fn is_close_to_interval(duration: Duration, interval_days: i32) -> bool {
		let end_at = Duration::days(interval_days.into());
		let diff = (duration - end_at).num_seconds();
		diff.abs() < 60
	}

	#[test]
	fn test_get_next_start_end_at_now() {
		let interval_days = 7;
		let (start_at, end_at) = get_next_start_end_at(None, interval_days, None, None);

		let now = Utc::now();
		let duration = end_at.signed_duration_since(now);
		assert!(is_close_to_interval(
			duration,
			interval_days.try_into().unwrap()
		));
		assert!(is_close_to_now(start_at.into()));
	}

	#[test]
	fn test_get_next_start_end_at_multiple_calls() {
		let interval_days = 30;
		let original_start_at =
			DateTime::parse_from_rfc3339("2023-03-14T00:00:00Z").unwrap();
		let mut last_end_at = original_start_at;
		let (start_at, end_at) =
			get_next_start_end_at(Some(last_end_at), interval_days, None, None);

		assert_eq!(start_at, original_start_at);
		assert_eq!(
			end_at,
			DateTime::parse_from_rfc3339("2023-04-13T00:00:00Z").unwrap()
		);

		// check next
		last_end_at = end_at;
		let (start_at, end_at) =
			get_next_start_end_at(Some(last_end_at), interval_days, None, None);

		assert_eq!(
			start_at,
			DateTime::parse_from_rfc3339("2023-04-13T00:00:00Z").unwrap()
		);
		assert_eq!(
			end_at,
			DateTime::parse_from_rfc3339("2023-05-13T00:00:00Z").unwrap()
		);
	}

	#[test]
	fn test_get_next_start_end_at_with_start_and_end() {
		let interval_days = 30;
		let start_at: DateTime<FixedOffset> =
			DateTime::parse_from_rfc3339("2023-03-14T00:00:00Z").unwrap();
		let end_at: DateTime<FixedOffset> =
			DateTime::parse_from_rfc3339("2023-04-14T00:00:00Z").unwrap();
		let (start_at_2, end_at_2) =
			get_next_start_end_at(None, interval_days, Some(start_at), Some(end_at));

		assert_eq!(start_at_2, start_at);
		assert_eq!(end_at_2, end_at);
	}

	#[test]
	fn test_get_next_start_end_at_with_start() {
		let interval_days = 30;
		let start_at: DateTime<FixedOffset> =
			DateTime::parse_from_rfc3339("2023-03-14T00:00:00Z").unwrap();
		let (start_at_2, end_at) =
			get_next_start_end_at(None, interval_days, Some(start_at), None);

		assert_eq!(start_at_2, start_at);
		assert_eq!(
			end_at,
			DateTime::parse_from_rfc3339("2023-04-13T00:00:00Z").unwrap()
		);
	}

	#[test]
	fn test_get_next_start_end_at_with_end() {
		let interval_days = 30;
		let end_at: DateTime<FixedOffset> =
			DateTime::parse_from_rfc3339("2023-04-13T00:00:00Z").unwrap();
		let (start_at, end_at_2) =
			get_next_start_end_at(None, interval_days, None, Some(end_at));

		assert_eq!(
			start_at,
			DateTime::parse_from_rfc3339("2023-03-14T00:00:00Z").unwrap()
		);
		assert_eq!(end_at_2, end_at);
	}
}
