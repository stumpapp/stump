use async_graphql::{CustomValidator, InputObject, InputValueError, Json, ID};
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
			hide_progress: Set(self.creator_hide_progress),
			display_name: Set(self.creator_display_name),
			user_id: Set(user.id.clone()),
			book_club_id: Set(id),
			bio: Set(None),
			joined_at: Set(chrono::Utc::now().into()),
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
			emoji,
			member_role_spec,
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
pub struct BookClubDiscussionInput {
	pub book_club_book_id: Option<ID>,
	pub title: Option<String>,
	pub is_pinned: bool,
}

#[derive(Debug, InputObject)]
pub struct AddBookToClubInput {
	pub book: BookClubBookVariant,
}

#[derive(Debug, InputObject)]
pub struct CreateBookClubMemberInput {
	pub user_id: String,
	pub display_name: Option<String>,
	pub role: BookClubMemberRole,
}

impl CreateBookClubMemberInput {
	pub fn into_active_model(self, book_club_id: &str) -> book_club_member::ActiveModel {
		book_club_member::ActiveModel {
			id: Set(Uuid::new_v4().to_string()),
			display_name: Set(self.display_name),
			book_club_id: Set(book_club_id.to_string()),
			hide_progress: Set(false),
			user_id: Set(self.user_id),
			role: Set(self.role),
			..Default::default()
		}
	}
}

#[derive(Debug, InputObject)]
pub struct SendMessageInput {
	pub content: String,
	/// The parent message inside a thread, denoting this message as a child
	pub parent_message_id: Option<String>,
	/// An inline reply reference, NOT a child of a thread
	pub reply_to_message_id: Option<String>,
}

#[derive(Debug, InputObject)]
pub struct EditMessageInput {
	pub content: String,
}

#[derive(Debug, InputObject)]
pub struct CreateCustomEmojiInput {
	pub name: String,
	pub is_animated: bool,
}

#[derive(Debug, InputObject)]
pub struct UpdateCustomEmojiInput {
	pub name: String,
}

#[derive(Debug, InputObject)]
pub struct SuggestBookInput {
	pub book_id: Option<String>,
	pub title: Option<String>,
	pub author: Option<String>,
	pub url: Option<String>,
	pub notes: Option<String>,
}

#[derive(Debug, InputObject)]
pub struct UpdateMemberProfileInput {
	pub display_name: Option<String>,
	pub bio: Option<String>,
	pub hide_progress: Option<bool>,
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
