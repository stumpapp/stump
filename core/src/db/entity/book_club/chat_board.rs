use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::prisma::{
	book_club_chat_board, book_club_chat_message, book_club_chat_message_like,
};

use super::BookClubMember;

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
