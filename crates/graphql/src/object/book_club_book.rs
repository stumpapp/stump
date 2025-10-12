// TODO(book-clubs): This needs a restructure but I can't prioritize book clubs right now.

use async_graphql::{ComplexObject, OneofObject, Result, SimpleObject, Union};
use models::{
	entity::book_club_book,
	shared::book_club::{BookClubExternalBook, BookClubInternalBook},
};
use serde::{Deserialize, Serialize};

use crate::object::media::Media;

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq, Union, OneofObject)]
#[graphql(input_name = "BookClubBookInput")]
pub enum BookClubBookVariant {
	Stored(BookClubInternalBook),
	External(BookClubExternalBook),
}

#[derive(Debug, Clone, SimpleObject)]
#[graphql(complex)]
pub struct BookClubBook {
	#[graphql(flatten)]
	value: BookClubBookVariant,
	#[graphql(flatten)]
	model: book_club_book::Model,
}

impl From<book_club_book::Model> for BookClubBook {
	fn from(book_club_book: book_club_book::Model) -> Self {
		match book_club_book.book_entity_id.clone() {
			Some(book_entity_id) => Self {
				value: BookClubBookVariant::Stored(BookClubInternalBook {
					id: book_entity_id,
				}),
				model: book_club_book,
			},
			None => Self {
				value: BookClubBookVariant::External(BookClubExternalBook {
					title: book_club_book.title.clone().unwrap_or_default(),
					author: book_club_book.author.clone().unwrap_or_default(),
					url: book_club_book.url.clone(),
					image_url: book_club_book.image_url.clone(),
				}),
				model: book_club_book,
			},
		}
	}
}

#[ComplexObject]
impl BookClubBook {
	async fn entity(&self) -> Result<Option<Media>> {
		unimplemented!()
	}
}
