use async_graphql::{ComplexObject, Context, OneofObject, Result, SimpleObject, Union};
use models::{
	entity::{book_club_book, book_club_discussion, media},
	shared::book_club::{BookClubExternalBook, BookClubInternalBook},
};
use sea_orm::{prelude::*, QueryFilter, QueryOrder};
use serde::{Deserialize, Serialize};

use crate::data::{AuthContext, CoreContext};
use crate::object::media::Media;
use crate::object::{
	book_club::verify_read_access, book_club_discussion::BookClubDiscussion,
};

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
	async fn entity(&self, ctx: &Context<'_>) -> Result<Option<Media>> {
		let Some(book_entity_id) = &self.model.book_entity_id else {
			return Ok(None);
		};

		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let model = media::ModelWithMetadata::find_by_id(book_entity_id.clone())
			.into_model::<media::ModelWithMetadata>()
			.one(conn)
			.await?;

		Ok(model.map(Media::from))
	}

	async fn discussions(&self, ctx: &Context<'_>) -> Result<Vec<BookClubDiscussion>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		verify_read_access(&self.model.book_club_id, user, conn).await?;

		let discussions = book_club_discussion::Entity::find()
			.filter(book_club_discussion::Column::BookClubBookId.eq(&self.model.id))
			.order_by_asc(book_club_discussion::Column::CreatedAt)
			.all(conn)
			.await?;

		Ok(discussions
			.into_iter()
			.map(BookClubDiscussion::from)
			.collect())
	}
}
