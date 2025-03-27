use async_graphql::{Context, Object, Result, ID};
use chrono::{DateTime, Duration, FixedOffset, Utc};
use models::{
	entity::{
		book_club, book_club_book, book_club_invitation, book_club_member,
		book_club_schedule,
	},
	shared::{
		book_club::{
			BookClubBook, BookClubExternalBook, BookClubInternalBook, BookClubMemberRole,
		},
		enums::UserPermission,
	},
};
use sea_orm::{prelude::*, IntoActiveModel, QueryOrder, Set, TransactionTrait};

use crate::{
	data::{CoreContext, RequestContext},
	guard::PermissionGuard,
	input::book_club::{
		BookClubInvitationInput, BookClubInvitationResponseInput,
		BookClubInvitationResponseValidator, CreateBookClubInput,
		CreateBookClubScheduleBook, CreateBookClubScheduleInput, UpdateBookClubInput,
	},
	object::{book_club::BookClub, book_club_invitation::BookClubInvitation},
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

		let book_club = book_club::Entity::find_for_member_enforce_role(
			user,
			BookClubMemberRole::Admin,
		)
		.filter(book_club::Column::Id.eq(id.to_string()))
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

		let _book_club = book_club::Entity::find_for_member_enforce_role(
			user,
			BookClubMemberRole::Admin,
		)
		.filter(book_club::Column::Id.eq(id.to_string()))
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

		let invitation = book_club_invitation::ActiveModel {
			role: Set(input.role.unwrap_or(BookClubMemberRole::Member)),
			user_id: Set(input.user_id),
			book_club_id: Set(id.to_string()),
			..Default::default()
		};
		let created_invitation = invitation.insert(conn).await?;

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

		let invitation = book_club_invitation::Entity::find_by_id(id.to_string())
			.filter(book_club_invitation::Column::UserId.eq(user.id.clone()))
			.one(conn)
			.await?
			.ok_or("Invitation not found")?;

		if !input.accept {
			// TODO: soft delete?
			invitation.clone().delete(conn).await?;
			return Ok(invitation.into());
		}

		// Note: We should never hit this branch because the validator should catch this.
		// Otherwise, the delete branch above would require another invite to be sent.
		let member_input = input
			.member
			.ok_or("Accepting an invitation requires a member object")?;

		let member = book_club_member::ActiveModel {
			display_name: Set(member_input.display_name),
			private_membership: Set(member_input.private_membership.unwrap_or(false)),
			user_id: Set(user.id.clone()),
			book_club_id: Set(invitation.book_club_id.clone()),
			role: Set(invitation.role),
			is_creator: Set(false),
			..Default::default()
		};
		let _created_member = member.insert(conn).await?;
		// TODO: soft delete?
		invitation.clone().delete(conn).await?;

		Ok(invitation.into())
	}

	// async fn create_book_club_member(&self, book_club_id: ID) -> Result<String> {
	// 	unimplemented!()
	// }

	async fn create_book_club_schedule(
		&self,
		ctx: &Context<'_>,
		id: ID,
		input: CreateBookClubScheduleInput,
	) -> Result<BookClub> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let book_club = book_club::Entity::find_for_member_enforce_role(
			user,
			BookClubMemberRole::Admin,
		)
		.filter(book_club::Column::Id.eq(id.to_string()))
		.one(conn)
		.await?
		.ok_or("Book club not found or you lack permission to create schedule")?;

		let interval_days = input.default_interval_days.unwrap_or(30);
		let books_to_create = input.books;

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
			.map(|book| {
				create_book_active_model(&created_schedule, &mut last_end_at, book)
			})
			.collect::<Vec<_>>();

		book_club_book::Entity::insert_many(active_models)
			.exec(&txn)
			.await?;

		txn.commit().await?;

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

		let book_club = book_club::Entity::find_for_member_enforce_role(
			user,
			BookClubMemberRole::Admin,
		)
		.filter(book_club::Column::Id.eq(id.to_string()))
		.one(conn)
		.await?
		.ok_or("Book club not found or you lack permission to adjust the schedule")?;

		let schedule = book_club_schedule::Entity::find()
			.filter(book_club_schedule::Column::BookClubId.eq(id.to_string()))
			.one(conn)
			.await?
			.ok_or("Schedule not found")?;
		let existing_books = book_club_book::Entity::find()
			.filter(
				book_club_book::Column::BookClubScheduleId
					.eq(schedule.id)
					.and(
						book_club_book::Column::EndAt
							.gte::<DateTimeWithTimeZone>(Utc::now().into()),
					),
			)
			.order_by_asc(book_club_book::Column::StartAt)
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

	let (start_at, end_at) = match (start_at, end_at) {
		(Some(start_at), Some(end_at)) => (start_at, end_at),
		(Some(start_at), None) => (
			start_at,
			start_at + Duration::days(i64::from(interval_days)),
		),
		(None, Some(end_at)) => {
			(end_at - Duration::days(i64::from(interval_days)), end_at)
		},
		(None, None) => {
			let start_at = if let Some(last_end_at) = *last_end_at {
				last_end_at
			} else {
				Utc::now().into()
			};
			(
				start_at,
				start_at + Duration::days(i64::from(interval_days)),
			)
		},
	};

	*last_end_at = Some(end_at);

	match book {
		BookClubBook::Stored(BookClubInternalBook { id }) => {
			book_club_book::ActiveModel {
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
