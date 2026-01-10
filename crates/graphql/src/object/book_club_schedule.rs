use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use chrono::Utc;
use models::entity::{book_club_book, book_club_schedule};
use sea_orm::prelude::*;

use crate::{data::CoreContext, object::book_club_book::BookClubBook};

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
	async fn active_books(&self, ctx: &Context<'_>) -> Result<Vec<BookClubBook>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let active_books = book_club_book::Entity::find_with_schedule_for_book_club_id(
			&self.model.book_club_id,
			Utc::now(),
		)
		.filter(book_club_book::Column::StartAt.lte(Utc::now()))
		.all(conn)
		.await?;

		Ok(active_books.into_iter().map(BookClubBook::from).collect())
	}

	async fn books(&self, ctx: &Context<'_>) -> Result<Vec<BookClubBook>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let book_club_books =
			book_club_book::Entity::find_with_schedule_for_book_club_id(
				&self.model.book_club_id,
				Utc::now(),
			)
			.into_model::<book_club_book::Model>()
			.all(conn)
			.await?;

		Ok(book_club_books
			.into_iter()
			.map(BookClubBook::from)
			.collect())
	}
}
