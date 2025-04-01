use super::{book_club_member::BookClubMember, book_club_schedule::BookClubSchedule};
use crate::data::{CoreContext, RequestContext};
use crate::object::book_club_invitation::BookClubInvitation;
use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use models::entity::{
	book_club, book_club_book, book_club_invitation, book_club_member, book_club_schedule,
};
use models::shared::book_club::{
	BookClubBook, BookClubExternalBook, BookClubInternalBook,
};
use sea_orm::{prelude::*, ColumnTrait, QueryOrder};

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

		let book_club_book = book_club_book::Entity::find_with_schedule(
			&self.model.id,
			chrono::Utc::now(),
		)
		.into_model::<book_club_book::Model>()
		.one(conn)
		.await?
		.ok_or("No current book found")?;

		Ok(book_club_book.into())
	}

	async fn invitations(&self, ctx: &Context<'_>) -> Result<Vec<BookClubInvitation>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let book_club_invitations = book_club_invitation::Entity::find()
			.filter(book_club_invitation::Column::BookClubId.eq(&self.model.id.clone()))
			.into_model::<book_club_invitation::Model>()
			.all(conn)
			.await?;

		Ok(book_club_invitations
			.into_iter()
			.map(BookClubInvitation::from)
			.collect())
	}

	async fn members(&self, ctx: &Context<'_>) -> Result<Vec<BookClubMember>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let book_club_members =
			book_club_member::Entity::find_members_accessible_to_user(user)
				.filter(book_club_member::Column::BookClubId.eq(&self.model.id.clone()))
				.into_model::<book_club_member::Model>()
				.all(conn)
				.await?;

		Ok(book_club_members
			.into_iter()
			.map(BookClubMember::from)
			.collect())
	}

	async fn schedule(&self, ctx: &Context<'_>) -> Result<BookClubSchedule> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let book_club_schedule = book_club_schedule::Entity::find()
			.filter(book_club_schedule::Column::BookClubId.eq(&self.model.id.clone()))
			.into_model::<book_club_schedule::Model>()
			.one(conn)
			.await?
			.ok_or("No schedule found")?;

		Ok(book_club_schedule.into())
	}
}
