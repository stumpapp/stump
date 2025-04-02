use async_graphql::{CustomValidator, InputObject, InputValueError, Json};
use models::{
	entity::{book_club, book_club_member, user::AuthUser},
	shared::book_club::{BookClubBook, BookClubMemberRole, BookClubMemberRoleSpec},
};
use sea_orm::{prelude::*, Set};

#[derive(Debug, InputObject)]
pub struct CreateBookClubInput {
	pub name: String,
	#[graphql(default)]
	pub is_private: bool,
	pub member_role_spec: Option<Json<BookClubMemberRoleSpec>>,
	pub creator_hide_progress: bool,
	pub creator_display_name: Option<String>,
}

impl CreateBookClubInput {
	pub fn into_active_model(
		self,
		user: &AuthUser,
	) -> (book_club::ActiveModel, book_club_member::ActiveModel) {
		let id = Uuid::new_v4().to_string();

		let club = book_club::ActiveModel {
			id: Set(id.clone()),
			name: Set(self.name),
			is_private: Set(self.is_private),
			member_role_spec: Set(self.member_role_spec.map(|spec| spec.0)),
			..Default::default()
		};

		let owning_member = book_club_member::ActiveModel {
			id: Set(Uuid::new_v4().to_string()),
			role: Set(BookClubMemberRole::Creator),
			is_creator: Set(true),
			hide_progress: Set(self.creator_hide_progress),
			display_name: Set(self.creator_display_name),
			user_id: Set(user.id.clone()),
			book_club_id: Set(id),
			..Default::default()
		};

		(club, owning_member)
	}
}

#[derive(Debug, InputObject)]
pub struct UpdateBookClubInput {
	pub name: Option<String>,
	pub description: Option<String>,
	pub is_private: Option<bool>,
	pub member_role_spec: Option<Json<BookClubMemberRoleSpec>>,
	pub emoji: Option<String>,
}

impl UpdateBookClubInput {
	pub fn apply(
		self,
		mut active_model: book_club::ActiveModel,
	) -> book_club::ActiveModel {
		let UpdateBookClubInput {
			name,
			description,
			is_private,
			member_role_spec,
			emoji,
		} = self;

		active_model.description = Set(description);
		active_model.emoji = Set(emoji);

		active_model.name = name.map(Set).unwrap_or(active_model.name);
		active_model.is_private = is_private.map(Set).unwrap_or(active_model.is_private);
		if let Some(spec) = member_role_spec {
			active_model.member_role_spec = Set(Some(spec.0));
		}

		active_model
	}
}

#[derive(Debug, InputObject)]
pub struct BookClubInvitationInput {
	pub user_id: String,
	pub role: Option<BookClubMemberRole>,
}

#[derive(Debug, Clone, InputObject)]
pub struct BookClubMemberInput {
	pub user_id: String,
	pub display_name: Option<String>,
	pub private_membership: Option<bool>,
}

#[derive(Debug, InputObject)]
pub struct BookClubInvitationResponseInput {
	pub accept: bool,
	pub member: Option<BookClubMemberInput>,
}

pub struct BookClubInvitationResponseValidator;

impl CustomValidator<BookClubInvitationResponseInput>
	for BookClubInvitationResponseValidator
{
	fn check(
		&self,
		value: &BookClubInvitationResponseInput,
	) -> Result<(), InputValueError<BookClubInvitationResponseInput>> {
		match (value.accept, &value.member) {
			(true, None) => Err(InputValueError::custom(
				"Accepting an invitation requires a member object",
			)),
			(false, Some(_)) => Err(InputValueError::custom(
				"Rejecting an invitation should not include a member object",
			)),
			_ => Ok(()),
		}
	}
}

#[derive(Debug, InputObject)]
pub struct CreateBookClubScheduleBook {
	pub book: BookClubBook,
	pub start_at: Option<DateTimeWithTimeZone>,
	pub end_at: Option<DateTimeWithTimeZone>,
	pub discussion_duration_days: Option<i32>,
}

#[derive(Debug, InputObject)]
pub struct CreateBookClubScheduleInput {
	pub default_interval_days: Option<i32>,
	pub books: Vec<CreateBookClubScheduleBook>,
}

#[derive(Debug, InputObject)]
pub struct CreateBookClubMemberInput {
	pub user_id: String,
	pub display_name: Option<String>,
	pub private_membership: Option<bool>,
	pub role: BookClubMemberRole,
}

impl CreateBookClubMemberInput {
	pub fn into_active_model(self, book_club_id: &str) -> book_club_member::ActiveModel {
		book_club_member::ActiveModel {
			id: Set(self.user_id),
			display_name: Set(self.display_name),
			book_club_id: Set(book_club_id.to_string()),
			private_membership: Set(self.private_membership.unwrap_or(false)),
			hide_progress: Set(self.private_membership.unwrap_or(false)),
			role: Set(self.role),
			..Default::default()
		}
	}
}
