use crate::data::CoreContext;
use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use models::entity::{book_club, book_club_book, book_club_schedule};
use models::shared::book_club::{
	BookClubBook, BookClubExternalBook, BookClubInternalBook,
};
use sea_orm::{prelude::*, ColumnTrait, QueryOrder, QuerySelect};

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct BookClub {
	#[graphql(flatten)]
	model: book_club::Model,
}

impl From<book_club::Model> for BookClub {
	fn from(model: book_club::Model) -> Self {
		Self { model }
	}
}

#[ComplexObject]
impl BookClub {
	// TODO(book-clubs): Support multiple books at once?
	async fn current_book(&self, ctx: &Context<'_>) -> Result<BookClubBook> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let book_club_book = book_club_book::Entity::find()
			.inner_join(book_club_schedule::Entity)
			.filter(book_club_schedule::Column::BookClubId.eq(&self.model.id.clone()))
			.filter(book_club_book::Column::EndAt.gte(chrono::Utc::now()))
			.order_by_asc(book_club_book::Column::StartAt)
			.into_model::<book_club_book::Model>()
			.one(conn)
			.await?
			.ok_or("No current book found")?;

		match book_club_book.book_entity_id {
			Some(book_entity_id) => Ok(BookClubBook::Stored(BookClubInternalBook {
				id: book_entity_id,
			})),
			None => Ok(BookClubBook::External(BookClubExternalBook {
				title: book_club_book.title.unwrap_or_default(),
				author: book_club_book.author.unwrap_or_default(),
				url: book_club_book.url,
				image_url: book_club_book.image_url,
			})),
		}
	}

	async fn invitations(&self) -> Result<String> {
		unimplemented!()
	}

	async fn members(&self) -> Result<String> {
		unimplemented!()
	}

	async fn schedule(&self) -> Result<String> {
		unimplemented!()
	}
}
