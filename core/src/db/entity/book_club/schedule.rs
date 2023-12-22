use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{
	db::entity::Media,
	prisma::{book_club_book, book_club_schedule},
};

use super::{prisma_macros::book_club_with_books_include, BookClubChatBoard};

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
