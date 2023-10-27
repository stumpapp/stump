use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use super::{Media, User};
use crate::prisma::{
	book_club, book_club_book, book_club_chat_board, book_club_chat_message,
	book_club_chat_message_like, book_club_invitation, book_club_member,
	book_club_schedule,
};

// TODO: figure out ordering relations...

book_club::include!((filters: Vec<book_club_member::WhereParam>) => book_club_member_user_username {
	members(filters): include {
		user: select {
			username
		}
	}
});

book_club::include!((filters: Vec<book_club_member::WhereParam>) => book_club_member_and_schedule_include {
	members(filters): include {
		user: select {
			username
		}
	}
	schedule
});

// TODO: filter future books if not admin!
book_club::include!((filters: Vec<book_club_member::WhereParam>) => book_club_with_books_include {
	members(filters): include {
		user: select {
			username
		}
	}
	schedule: include {
		books
	}
});

book_club::include!(book_club_with_schedule { schedule });

#[derive(Default, Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct BookClub {
	id: String,
	name: String,
	description: Option<String>,
	is_private: bool,
	created_at: String,
	member_role_spec: BookClubMemberRoleSpec,

	#[serde(skip_serializing_if = "Option::is_none")]
	members: Option<Vec<BookClubMember>>,
	#[serde(skip_serializing_if = "Option::is_none")]
	schedule: Option<BookClubSchedule>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct BookClubMember {
	pub id: String,

	#[specta(optional)]
	pub display_name: Option<String>,
	pub is_creator: bool,
	pub hide_progress: bool,
	pub private_membership: bool,
	pub role: BookClubMemberRole,

	#[serde(skip_serializing_if = "Option::is_none")]
	pub user: Option<User>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub book_club: Option<BookClub>,
}

#[derive(
	Default, Debug, Clone, Deserialize, Serialize, Type, ToSchema, PartialEq, Eq, Hash,
)]
pub enum BookClubMemberRole {
	#[default]
	#[serde(rename = "MEMBER")]
	MEMBER = 0, // default, read-only access
	#[serde(rename = "MODERATOR")]
	MODERATOR = 1, // can delete messages
	#[serde(rename = "ADMIN")]
	ADMIN = 2, // can add/remove members, change schedule, etc.
	#[serde(rename = "CREATOR")]
	CREATOR = 3, // can delete the book club, change name, etc.
}

impl From<i32> for BookClubMemberRole {
	fn from(val: i32) -> Self {
		match val {
			0 => BookClubMemberRole::MEMBER,
			1 => BookClubMemberRole::MODERATOR,
			2 => BookClubMemberRole::ADMIN,
			3 => BookClubMemberRole::CREATOR,
			_ => BookClubMemberRole::MEMBER,
		}
	}
}

// A map of [BookClubMemberRole] to a [String] representing the club-specific
// name for a role
#[derive(Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
#[serde(transparent)]
pub struct BookClubMemberRoleSpec(HashMap<BookClubMemberRole, String>);
impl Default for BookClubMemberRoleSpec {
	fn default() -> Self {
		let mut map = HashMap::new();
		map.insert(BookClubMemberRole::MEMBER, "Member".to_string());
		map.insert(BookClubMemberRole::MODERATOR, "Moderator".to_string());
		map.insert(BookClubMemberRole::ADMIN, "Admin".to_string());
		map.insert(BookClubMemberRole::CREATOR, "Creator".to_string());
		Self(map)
	}
}

impl From<Vec<u8>> for BookClubMemberRoleSpec {
	fn from(value: Vec<u8>) -> Self {
		serde_json::from_slice(&value).unwrap_or_else(|error| {
			tracing::error!(error = ?error, "Failed to deserialize member_role_spec");
			Self::default()
		})
	}
}

impl From<BookClubMemberRoleSpec> for Vec<u8> {
	fn from(value: BookClubMemberRoleSpec) -> Self {
		serde_json::to_vec(&value).unwrap_or_else(|error| {
			tracing::error!(error = ?error, "Failed to serialize member_role_spec");
			vec![]
		})
	}
}

impl From<BookClubMemberRole> for i32 {
	fn from(val: BookClubMemberRole) -> Self {
		match val {
			BookClubMemberRole::MEMBER => 0,
			BookClubMemberRole::MODERATOR => 1,
			BookClubMemberRole::ADMIN => 2,
			BookClubMemberRole::CREATOR => 3,
		}
	}
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct BookClubSchedule {
	pub default_interval_days: Option<i32>,

	#[serde(skip_serializing_if = "Option::is_none")]
	pub books: Option<Vec<BookClubBook>>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct BookClubBook {
	id: String,

	start_at: String,
	end_at: String,
	discussion_duration_days: i32,

	#[serde(skip_serializing_if = "Option::is_none")]
	pub title: Option<String>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub author: Option<String>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub url: Option<String>,

	#[serde(skip_serializing_if = "Option::is_none")]
	pub book_entity: Option<Media>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub chat_board: Option<BookClubChatBoard>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct BookClubChatBoard {
	id: String,
	messages: Option<Vec<BookClubChatMessage>>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct BookClubChatMessage {
	id: String,
	content: String,
	timestamp: String,
	is_top_message: bool,

	#[serde(skip_serializing_if = "Option::is_none")]
	child_messages: Option<Vec<BookClubChatMessage>>,
	#[serde(skip_serializing_if = "Option::is_none")]
	likes: Option<Vec<BookClubChatMessageLike>>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub member: Option<BookClubMember>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct BookClubChatMessageLike {
	id: String,
	timestamp: String,

	#[serde(skip_serializing_if = "Option::is_none")]
	liked_by: Option<BookClubMember>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct BookClubInvitation {
	id: String,

	#[serde(skip_serializing_if = "Option::is_none")]
	pub user: Option<User>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub book_club: Option<BookClub>,
}

impl From<book_club::Data> for BookClub {
	fn from(data: book_club::Data) -> BookClub {
		let members = data.members().ok().map(|members| {
			members
				.iter()
				.cloned()
				.map(BookClubMember::from)
				.collect::<Vec<BookClubMember>>()
		});

		let schedule = data
			.schedule()
			.ok()
			.flatten()
			.cloned()
			.map(BookClubSchedule::from);

		let member_role_spec = data
			.member_role_spec
			.map(BookClubMemberRoleSpec::from)
			.unwrap_or_default();

		BookClub {
			id: data.id,
			name: data.name,
			description: data.description,
			is_private: data.is_private,
			created_at: data.created_at.to_rfc3339(),
			members,
			schedule,
			member_role_spec,
		}
	}
}

impl From<book_club_member_user_username::Data> for BookClub {
	fn from(data: book_club_member_user_username::Data) -> BookClub {
		let members = data
			.members
			.into_iter()
			.map(BookClubMember::from)
			.collect::<Vec<BookClubMember>>();
		let member_role_spec = data
			.member_role_spec
			.map(BookClubMemberRoleSpec::from)
			.unwrap_or_default();

		BookClub {
			id: data.id,
			name: data.name,
			description: data.description,
			is_private: data.is_private,
			created_at: data.created_at.to_rfc3339(),
			members: Some(members),
			member_role_spec,
			..Default::default()
		}
	}
}

impl From<book_club_member_and_schedule_include::Data> for BookClub {
	fn from(data: book_club_member_and_schedule_include::Data) -> BookClub {
		let members = data
			.members
			.into_iter()
			.map(BookClubMember::from)
			.collect::<Vec<BookClubMember>>();
		let member_role_spec = data
			.member_role_spec
			.map(BookClubMemberRoleSpec::from)
			.unwrap_or_default();

		BookClub {
			id: data.id,
			name: data.name,
			description: data.description,
			created_at: data.created_at.to_rfc3339(),
			is_private: data.is_private,
			members: Some(members),
			member_role_spec,
			..Default::default()
		}
	}
}

impl From<book_club_with_books_include::Data> for BookClub {
	fn from(data: book_club_with_books_include::Data) -> BookClub {
		let members = data
			.members
			.into_iter()
			.map(BookClubMember::from)
			.collect::<Vec<BookClubMember>>();

		let schedule = data.schedule.map(BookClubSchedule::from);
		let member_role_spec = data
			.member_role_spec
			.map(BookClubMemberRoleSpec::from)
			.unwrap_or_default();

		BookClub {
			id: data.id,
			name: data.name,
			description: data.description,
			is_private: data.is_private,
			created_at: data.created_at.to_rfc3339(),
			members: Some(members),
			schedule,
			member_role_spec,
		}
	}
}

impl From<book_club_member::Data> for BookClubMember {
	fn from(data: book_club_member::Data) -> BookClubMember {
		// TODO: relations
		BookClubMember {
			id: data.id,
			display_name: data.display_name,
			is_creator: data.is_creator,
			hide_progress: data.hide_progress,
			private_membership: data.private_membership,
			role: data.role.into(),
			..Default::default()
		}
	}
}

impl From<book_club_member_user_username::members::Data> for BookClubMember {
	fn from(data: book_club_member_user_username::members::Data) -> BookClubMember {
		BookClubMember {
			id: data.id,
			display_name: data.display_name.or(Some(data.user.username)),
			is_creator: data.is_creator,
			hide_progress: data.hide_progress,
			private_membership: data.private_membership,
			role: data.role.into(),
			..Default::default()
		}
	}
}

impl From<book_club_member_and_schedule_include::members::Data> for BookClubMember {
	fn from(
		data: book_club_member_and_schedule_include::members::Data,
	) -> BookClubMember {
		BookClubMember {
			id: data.id,
			display_name: data.display_name.or(Some(data.user.username)),
			is_creator: data.is_creator,
			hide_progress: data.hide_progress,
			private_membership: data.private_membership,
			role: data.role.into(),
			..Default::default()
		}
	}
}

impl From<book_club_with_books_include::members::Data> for BookClubMember {
	fn from(data: book_club_with_books_include::members::Data) -> BookClubMember {
		BookClubMember {
			id: data.id,
			display_name: data.display_name.or(Some(data.user.username)),
			is_creator: data.is_creator,
			hide_progress: data.hide_progress,
			private_membership: data.private_membership,
			role: data.role.into(),
			..Default::default()
		}
	}
}

impl From<book_club_schedule::Data> for BookClubSchedule {
	fn from(data: book_club_schedule::Data) -> BookClubSchedule {
		BookClubSchedule {
			default_interval_days: data.default_interval_days,
			..Default::default()
		}
	}
}

impl From<book_club_with_books_include::schedule::Data> for BookClubSchedule {
	fn from(data: book_club_with_books_include::schedule::Data) -> BookClubSchedule {
		let books = data.books.into_iter().map(BookClubBook::from).collect();

		BookClubSchedule {
			default_interval_days: data.default_interval_days,
			books: Some(books),
		}
	}
}

impl From<(book_club_schedule::Data, Vec<book_club_book::Data>)> for BookClubSchedule {
	fn from(
		(data, books): (book_club_schedule::Data, Vec<book_club_book::Data>),
	) -> BookClubSchedule {
		let books = books.into_iter().map(BookClubBook::from).collect();

		BookClubSchedule {
			default_interval_days: data.default_interval_days,
			books: Some(books),
		}
	}
}

impl From<book_club_book::Data> for BookClubBook {
	fn from(data: book_club_book::Data) -> BookClubBook {
		let chat_board = data
			.chat_board()
			.ok()
			.flatten()
			.cloned()
			.map(BookClubChatBoard::from);

		let book = data.book_entity().ok().flatten().cloned().map(Media::from);

		BookClubBook {
			id: data.id,
			start_at: data.start_at.to_rfc3339(),
			end_at: data.end_at.to_rfc3339(),
			discussion_duration_days: data.discussion_duration_days.unwrap_or(2),
			title: data.title,
			author: data.author,
			url: data.url,
			chat_board,
			book_entity: book,
		}
	}
}

impl From<book_club_chat_board::Data> for BookClubChatBoard {
	fn from(data: book_club_chat_board::Data) -> BookClubChatBoard {
		let messages = data.messages().ok().cloned().map(|messages| {
			messages
				.into_iter()
				.map(BookClubChatMessage::from)
				.collect::<Vec<BookClubChatMessage>>()
		});

		BookClubChatBoard {
			id: data.id,
			messages,
		}
	}
}

impl From<book_club_chat_message_like::Data> for BookClubChatMessageLike {
	fn from(data: book_club_chat_message_like::Data) -> BookClubChatMessageLike {
		let liked_by = data.liked_by().ok().cloned().map(BookClubMember::from);

		BookClubChatMessageLike {
			id: data.id,
			timestamp: data.timestamp.to_rfc3339(),
			liked_by,
		}
	}
}

impl From<book_club_chat_message::Data> for BookClubChatMessage {
	fn from(data: book_club_chat_message::Data) -> BookClubChatMessage {
		let member = data
			.member()
			.ok()
			.flatten()
			.cloned()
			.map(BookClubMember::from);

		let child_messages = data.child_messages().ok().cloned().map(|messages| {
			messages
				.into_iter()
				.map(BookClubChatMessage::from)
				.collect::<Vec<BookClubChatMessage>>()
		});

		let likes = data.likes().ok().cloned().map(|likes| {
			likes
				.into_iter()
				.map(BookClubChatMessageLike::from)
				.collect::<Vec<BookClubChatMessageLike>>()
		});

		BookClubChatMessage {
			id: data.id,
			content: data.content,
			timestamp: data.timestamp.to_rfc3339(),
			is_top_message: data.is_top_message,
			child_messages,
			member,
			likes,
		}
	}
}

impl From<book_club_invitation::Data> for BookClubInvitation {
	fn from(data: book_club_invitation::Data) -> BookClubInvitation {
		let user = data.user().ok().cloned().map(User::from);
		let book_club = data.book_club().ok().cloned().map(BookClub::from);
		BookClubInvitation {
			id: data.id,
			user,
			book_club,
		}
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn deserialize_member_role_spec_from_str() {
		let spec = r#"{"MEMBER":"Member","MODERATOR":"Moderator","ADMIN":"Admin","CREATOR":"Creator"}"#;
		let spec: BookClubMemberRoleSpec = serde_json::from_str(spec).unwrap();
		assert_eq!(spec.0.len(), 4);
		assert_eq!(
			spec.0.get(&BookClubMemberRole::MEMBER),
			Some(&"Member".to_string())
		);
		assert_eq!(
			spec.0.get(&BookClubMemberRole::MODERATOR),
			Some(&"Moderator".to_string())
		);
		assert_eq!(
			spec.0.get(&BookClubMemberRole::ADMIN),
			Some(&"Admin".to_string())
		);
		assert_eq!(
			spec.0.get(&BookClubMemberRole::CREATOR),
			Some(&"Creator".to_string())
		);
	}

	#[test]
	fn deserialize_member_role_spec_from_bytes() {
		let spec_str = r#"{"MEMBER":"Crewmate","MODERATOR":"Boatswain","ADMIN":"First Mate","CREATOR":"Captain"}"#;
		let spec_json = serde_json::from_str::<serde_json::Value>(spec_str).unwrap();
		let spec_bytes = spec_json.to_string().into_bytes();
		let spec = BookClubMemberRoleSpec::from(spec_bytes);
		assert_eq!(spec.0.len(), 4);
		assert_eq!(
			spec.0.get(&BookClubMemberRole::MEMBER),
			Some(&"Crewmate".to_string())
		);
		assert_eq!(
			spec.0.get(&BookClubMemberRole::MODERATOR),
			Some(&"Boatswain".to_string())
		);
		assert_eq!(
			spec.0.get(&BookClubMemberRole::ADMIN),
			Some(&"First Mate".to_string())
		);
		assert_eq!(
			spec.0.get(&BookClubMemberRole::CREATOR),
			Some(&"Captain".to_string())
		);
	}
}
