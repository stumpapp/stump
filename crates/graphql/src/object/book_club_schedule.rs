use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use models::{
	entity::{book_club_book, book_club_schedule},
	shared::book_club::BookClubBook,
};
use sea_orm::{prelude::*, ColumnTrait, EntityTrait, QueryOrder};

use crate::data::CoreContext;

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct BookClubSchedule {
	#[graphql(flatten)]
	model: book_club_schedule::Model,
}

impl From<book_club_schedule::Model> for BookClubSchedule {
	fn from(model: book_club_schedule::Model) -> Self {
		Self { model }
	}
}

#[ComplexObject]
impl BookClubSchedule {
	async fn books(&self, ctx: &Context<'_>) -> Result<Vec<BookClubBook>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let book_club_books = book_club_book::Entity::find()
			.inner_join(book_club_schedule::Entity)
			.filter(book_club_schedule::Column::Id.eq(self.model.id))
			.filter(book_club_book::Column::EndAt.gte(chrono::Utc::now()))
			.order_by_asc(book_club_book::Column::StartAt)
			.into_model::<book_club_book::Model>()
			.all(conn)
			.await?;

		Ok(book_club_books
			.into_iter()
			.map(BookClubBook::from)
			.collect())
	}
}
