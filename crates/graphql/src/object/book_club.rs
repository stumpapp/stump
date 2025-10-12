use super::{book_club_member::BookClubMember, book_club_schedule::BookClubSchedule};
use crate::data::{AuthContext, CoreContext};
use crate::object::book_club_book::BookClubBook;
use crate::object::book_club_invitation::BookClubInvitation;
use async_graphql::{ComplexObject, Context, Json, Result, SimpleObject};
use models::entity::{
	book_club, book_club_book, book_club_invitation, book_club_member, book_club_schedule,
};
use models::shared::book_club::BookClubMemberRoleSpec;
use sea_orm::prelude::*;

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
	async fn creator(&self, ctx: &Context<'_>) -> Result<BookClubMember> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let creator = book_club_member::Entity::find()
			.filter(
				book_club_member::Column::BookClubId
					.eq(self.model.id.clone())
					.and(book_club_member::Column::IsCreator.eq(true)),
			)
			.one(conn)
			.await?
			.ok_or_else(|| async_graphql::Error::new("Book club creator not found"))?;

		Ok(BookClubMember::from(creator))
	}

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

	async fn members_count(&self, ctx: &Context<'_>) -> Result<u64> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let count =
			book_club_member::Entity::find_members_accessible_to_user_for_book_club_id(
				user,
				&self.model.id.clone(),
			)
			.count(conn)
			.await?;

		Ok(count)
	}

	async fn membership(&self, ctx: &Context<'_>) -> Result<Option<BookClubMember>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let membership = book_club_member::Entity::find()
			.filter(
				book_club_member::Column::BookClubId
					.eq(self.model.id.clone())
					.and(book_club_member::Column::UserId.eq(user.id.clone())),
			)
			.into_model::<book_club_member::Model>()
			.one(conn)
			.await?;

		Ok(membership.map(BookClubMember::from))
	}

	async fn role_spec(&self) -> Result<Json<BookClubMemberRoleSpec>> {
		let spec = self.model.member_role_spec.clone().unwrap_or_default();
		Ok(Json(spec))
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
