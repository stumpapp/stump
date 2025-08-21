use super::{book_club_member::BookClubMember, book_club_schedule::BookClubSchedule};
use crate::data::{AuthContext, CoreContext};
use crate::object::book_club_invitation::BookClubInvitation;
use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use models::entity::{
	book_club, book_club_book, book_club_invitation, book_club_member, book_club_schedule,
};
use models::shared::book_club::BookClubBook;

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
	async fn current_book(&self, ctx: &Context<'_>) -> Result<Option<BookClubBook>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let book_club_book = book_club_book::Entity::find_with_schedule_for_book_club_id(
			&self.model.id,
			chrono::Utc::now(),
		)
		.into_model::<book_club_book::Model>()
		.one(conn)
		.await?;

		if let Some(book_club_book) = book_club_book {
			Ok(Some(book_club_book.into()))
		} else {
			Ok(None)
		}
	}

	async fn invitations(&self, ctx: &Context<'_>) -> Result<Vec<BookClubInvitation>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let book_club_invitations =
			book_club_invitation::Entity::find_for_book_club_id(&self.model.id.clone())
				.into_model::<book_club_invitation::Model>()
				.all(conn)
				.await?;

		Ok(book_club_invitations
			.into_iter()
			.map(BookClubInvitation::from)
			.collect())
	}

	async fn members(&self, ctx: &Context<'_>) -> Result<Vec<BookClubMember>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let book_club_members =
			book_club_member::Entity::find_members_accessible_to_user_for_book_club_id(
				user,
				&self.model.id.clone(),
			)
			.into_model::<book_club_member::Model>()
			.all(conn)
			.await?;

		Ok(book_club_members
			.into_iter()
			.map(BookClubMember::from)
			.collect())
	}

	async fn schedule(&self, ctx: &Context<'_>) -> Result<Option<BookClubSchedule>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let book_club_schedule =
			book_club_schedule::Entity::find_for_book_club_id(&self.model.id.clone())
				.into_model::<book_club_schedule::Model>()
				.one(conn)
				.await?;

		if let Some(book_club_schedule) = book_club_schedule {
			Ok(Some(book_club_schedule.into()))
		} else {
			Ok(None)
		}
	}
}
