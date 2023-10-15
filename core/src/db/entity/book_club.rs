use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use super::User;
use crate::prisma::{
	book_club, book_club_book, book_club_chat_board, book_club_chat_message,
	book_club_invitation, book_club_member, book_club_schedule,
};

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

#[derive(Default, Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct BookClub {
	id: String,
	name: String,
	private: bool,

	#[serde(skip_serializing_if = "Option::is_none")]
	members: Option<Vec<BookClubMember>>,
	#[serde(skip_serializing_if = "Option::is_none")]
	schedule: Option<BookClubSchedule>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct BookClubMember {
	#[specta(optional)]
	pub display_name: Option<String>,
	pub is_creator: bool,
	pub hide_progress: bool,
	pub private_membership: bool,

	#[serde(skip_serializing_if = "Option::is_none")]
	pub user: Option<User>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub book_club: Option<BookClub>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, Type, ToSchema, PartialEq)]
pub enum BookClubMemberRole {
	#[default]
	MEMBER = 0, // default, read-only access
	MODERATOR = 1, // can delete messages
	ADMIN = 2,     // can add/remove members, change schedule, etc.
	CREATOR = 3,   // can delete the book club, change name, etc.
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
	id: i32,
	order: i32,
	#[specta(optional)]
	start_at: Option<String>,
	#[specta(optional)]
	end_at: Option<String>,
	discussion_duration_days: i32,

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

	#[serde(skip_serializing_if = "Option::is_none")]
	pub member: Option<BookClubMember>,
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

		BookClub {
			id: data.id,
			name: data.name,
			private: data.private,
			members,
			schedule,
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

		BookClub {
			id: data.id,
			name: data.name,
			private: data.private,
			members: Some(members),
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

		BookClub {
			id: data.id,
			name: data.name,
			private: data.private,
			members: Some(members),
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

		BookClub {
			id: data.id,
			name: data.name,
			private: data.private,
			members: Some(members),
			schedule,
		}
	}
}

impl From<book_club_member::Data> for BookClubMember {
	fn from(data: book_club_member::Data) -> BookClubMember {
		// TODO: relations
		BookClubMember {
			display_name: data.display_name,
			is_creator: data.is_creator,
			hide_progress: data.hide_progress,
			private_membership: data.private_membership,
			..Default::default()
		}
	}
}

impl From<book_club_member_user_username::members::Data> for BookClubMember {
	fn from(data: book_club_member_user_username::members::Data) -> BookClubMember {
		BookClubMember {
			display_name: data.display_name.or(Some(data.user.username)),
			is_creator: data.is_creator,
			hide_progress: data.hide_progress,
			private_membership: data.private_membership,
			..Default::default()
		}
	}
}

impl From<book_club_member_and_schedule_include::members::Data> for BookClubMember {
	fn from(
		data: book_club_member_and_schedule_include::members::Data,
	) -> BookClubMember {
		BookClubMember {
			display_name: data.display_name.or(Some(data.user.username)),
			is_creator: data.is_creator,
			hide_progress: data.hide_progress,
			private_membership: data.private_membership,
			..Default::default()
		}
	}
}

impl From<book_club_with_books_include::members::Data> for BookClubMember {
	fn from(data: book_club_with_books_include::members::Data) -> BookClubMember {
		BookClubMember {
			display_name: data.display_name.or(Some(data.user.username)),
			is_creator: data.is_creator,
			hide_progress: data.hide_progress,
			private_membership: data.private_membership,
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

		BookClubBook {
			id: data.id,
			order: data.order,
			start_at: data.start_at.map(|d| d.to_rfc3339()),
			end_at: data.end_at.map(|d| d.to_rfc3339()),
			discussion_duration_days: data.discussion_duration_days.unwrap_or(2),
			chat_board,
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

impl From<book_club_chat_message::Data> for BookClubChatMessage {
	fn from(data: book_club_chat_message::Data) -> BookClubChatMessage {
		BookClubChatMessage {
			id: data.id,
			content: data.content,
			timestamp: data.timestamp.to_rfc3339(),
			..Default::default()
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
