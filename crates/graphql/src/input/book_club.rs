use async_graphql::{CustomValidator, InputObject, InputValueError, Json};
use models::{
	entity::{book_club, book_club_member, user::AuthUser},
	shared::book_club::{BookClubMemberRole, BookClubMemberRoleSpec},
};
use sea_orm::{prelude::*, Set};
use slugify::slugify;

use crate::object::book_club_book::BookClubBookVariant;

#[derive(Debug, InputObject)]
pub struct CreateBookClubInput {
	pub name: String,
	pub slug: Option<String>,
	#[graphql(default)]
	pub is_private: bool,
	pub description: Option<String>,
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
		let slug = self
			.slug
			.map(|s| slugify!(s.as_str()))
			.unwrap_or_else(|| slugify!(self.name.as_str()));

		let club = book_club::ActiveModel {
			id: Set(id.clone()),
			name: Set(self.name),
			description: Set(self.description),
			is_private: Set(self.is_private),
			member_role_spec: Set(self.member_role_spec.map(|spec| spec.0)),
			slug: Set(slug),
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
			private_membership: Set(self.creator_hide_progress),
		};

		(club, owning_member)
	}

	pub fn validate(&self) -> Result<(), InputValueError<CreateBookClubInput>> {
		if let Some(slug) = &self.slug {
			if slug.is_empty() {
				return Err(InputValueError::custom("Slug cannot be empty"));
			} else if slugify!(slug) != *slug {
				return Err(InputValueError::custom(
					"Slug can only contain lowercase letters, numbers, and hyphens",
				));
			}
		}

		Ok(())
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
	pub book: BookClubBookVariant,
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
			id: Set(Uuid::new_v4().to_string()),
			display_name: Set(self.display_name),
			book_club_id: Set(book_club_id.to_string()),
			private_membership: Set(self.private_membership.unwrap_or(false)),
			hide_progress: Set(self.private_membership.unwrap_or(false)),
			user_id: Set(self.user_id),
			role: Set(self.role),
			..Default::default()
		}
	}
}

#[cfg(test)]
mod tests {
	use crate::tests::common::*;

	use super::*;
	use pretty_assertions::assert_eq;

	#[test]
	fn test_into_active_model() {
		let input = CreateBookClubInput {
			name: "Test".to_string(),
			slug: None,
			description: None,
			is_private: false,
			member_role_spec: None,
			creator_hide_progress: false,
			creator_display_name: None,
		};

		let user = get_default_user();

		let (club, member) = input.into_active_model(&user);

		assert_eq!(club.name, Set("Test".to_string()));
		assert_eq!(club.is_private, Set(false));
		assert_eq!(club.member_role_spec, Set(None));

		assert_eq!(member.role, Set(BookClubMemberRole::Creator));
		assert_eq!(member.hide_progress, Set(false));
		assert_eq!(member.display_name, Set(None));
		assert_eq!(member.user_id, Set(user.id));
		assert!(Uuid::parse_str(&member.id.unwrap()).is_ok());
	}
}
