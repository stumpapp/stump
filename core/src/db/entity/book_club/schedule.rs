use prisma_client_rust::chrono::{DateTime, FixedOffset};
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;
use specta::Type;
use utoipa::ToSchema;

use crate::{
	db::entity::Media,
	prisma::{book_club_book, book_club_schedule},
};

use super::{prisma_macros::book_club_with_books_include, BookClubDiscussion};

#[skip_serializing_none]
#[derive(Default, Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct BookClubSchedule {
	// The default interval between books in days, if any.
	pub default_interval_days: Option<i32>,
	// The books in the schedule. If this is `None` or empty, the schedule is empty.
	pub books: Option<Vec<BookClubBook>>,
}

#[skip_serializing_none]
#[derive(Default, Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct BookClubExternalBook {
	// The title of the book
	pub title: String,
	// The author of the book
	pub author: String,
	// The URL to the book's page, purchase page, etc.
	pub url: Option<String>,
	// The URL to the book's cover image
	pub image_url: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
#[serde(tag = "__type")]
pub enum BookClubBookDetails {
	#[serde(rename = "stored")]
	Stored(Media),
	#[serde(rename = "external")]
	External(BookClubExternalBook),
}

#[skip_serializing_none]
#[derive(Default, Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct BookClubBook {
	// The ID of the book in the schedule
	id: String,
	// The date the book club starts reading the book
	#[schema(value_type = String)]
	start_at: DateTime<FixedOffset>,
	// The date the book club stops reading the book, generally the meeting time
	#[schema(value_type = String)]
	end_at: DateTime<FixedOffset>,
	// The number of days the book club will discuss the book, if any
	discussion_duration_days: Option<i32>,

	// The book details, e.g. title, author, etc.
	book: Option<BookClubBookDetails>,

	// The chat board for the book, if any. If this is `None`, the book has no chat board or
	// the chat board is not loaded.
	pub discussion: Option<BookClubDiscussion>,
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
		let discussion = data
			.discussion()
			.ok()
			.flatten()
			.cloned()
			.map(BookClubDiscussion::from);

		let book_entity = data.book_entity().ok().flatten().cloned().map(Media::from);
		let book = match (book_entity, data.title, data.author) {
			(Some(book_entity), _, _) => Some(BookClubBookDetails::Stored(book_entity)),
			(_, Some(title), Some(author)) => {
				Some(BookClubBookDetails::External(BookClubExternalBook {
					title,
					author,
					url: data.url,
					image_url: data.image_url,
				}))
			},
			_ => None,
		};

		BookClubBook {
			id: data.id,
			start_at: data.start_at,
			end_at: data.end_at,
			discussion_duration_days: data.discussion_duration_days,
			discussion,
			book,
		}
	}
}
