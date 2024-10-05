use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::prisma::{
	book_club_discussion, book_club_discussion_message, book_club_discussion_message_like,
};

use super::BookClubMember;

#[derive(Default, Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct BookClubDiscussion {
	id: String,
	messages: Option<Vec<BookClubDiscussionMessage>>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct BookClubDiscussionMessage {
	id: String,
	content: String,
	timestamp: String,
	is_top_message: bool,

	#[serde(skip_serializing_if = "Option::is_none")]
	child_messages: Option<Vec<BookClubDiscussionMessage>>,
	#[serde(skip_serializing_if = "Option::is_none")]
	likes: Option<Vec<BookClubDiscussionMessageLike>>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub member: Option<BookClubMember>,
}

#[derive(Default, Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct BookClubDiscussionMessageLike {
	id: String,
	timestamp: String,

	#[serde(skip_serializing_if = "Option::is_none")]
	liked_by: Option<BookClubMember>,
}

impl From<book_club_discussion::Data> for BookClubDiscussion {
	fn from(data: book_club_discussion::Data) -> BookClubDiscussion {
		let messages = data.messages().ok().cloned().map(|messages| {
			messages
				.into_iter()
				.map(BookClubDiscussionMessage::from)
				.collect::<Vec<BookClubDiscussionMessage>>()
		});

		BookClubDiscussion {
			id: data.id,
			messages,
		}
	}
}

impl From<book_club_discussion_message_like::Data> for BookClubDiscussionMessageLike {
	fn from(
		data: book_club_discussion_message_like::Data,
	) -> BookClubDiscussionMessageLike {
		let liked_by = data.liked_by().ok().cloned().map(BookClubMember::from);

		BookClubDiscussionMessageLike {
			id: data.id,
			timestamp: data.timestamp.to_rfc3339(),
			liked_by,
		}
	}
}

impl From<book_club_discussion_message::Data> for BookClubDiscussionMessage {
	fn from(data: book_club_discussion_message::Data) -> BookClubDiscussionMessage {
		let member = data
			.member()
			.ok()
			.flatten()
			.cloned()
			.map(BookClubMember::from);

		let child_messages = data.child_messages().ok().cloned().map(|messages| {
			messages
				.into_iter()
				.map(BookClubDiscussionMessage::from)
				.collect::<Vec<BookClubDiscussionMessage>>()
		});

		let likes = data.likes().ok().cloned().map(|likes| {
			likes
				.into_iter()
				.map(BookClubDiscussionMessageLike::from)
				.collect::<Vec<BookClubDiscussionMessageLike>>()
		});

		BookClubDiscussionMessage {
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
