use super::book_club_member::BookClubMember;
use crate::data::{AuthContext, CoreContext};
use crate::object::book_club_book::BookClubBook;
use crate::object::book_club_discussion::BookClubDiscussion;
use crate::object::book_club_invitation::BookClubInvitation;
use async_graphql::{ComplexObject, Context, Json, Result, SimpleObject};
use models::entity::{
	book_club, book_club_book, book_club_discussion, book_club_invitation,
	book_club_member,
};
use models::shared::book_club::{BookClubMemberRole, BookClubMemberRoleSpec};
use sea_orm::prelude::*;
use sea_orm::sea_query::Query;
use sea_orm::QueryOrder;

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
	async fn role_spec(&self) -> Json<BookClubMemberRoleSpec> {
		Json(self.model.member_role_spec.clone().unwrap_or_default())
	}

	async fn creator(&self, ctx: &Context<'_>) -> Result<BookClubMember> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let creator = book_club_member::Entity::find()
			.filter(
				book_club_member::Column::BookClubId
					.eq(self.model.id.clone())
					.and(book_club_member::Column::Role.eq(BookClubMemberRole::Creator)),
			)
			.one(conn)
			.await?
			.ok_or_else(|| async_graphql::Error::new("Book club creator not found"))?;

		Ok(BookClubMember::from(creator))
	}

	/// The current book being read
	async fn current_book(&self, ctx: &Context<'_>) -> Result<Option<BookClubBook>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let book = book_club_book::Entity::find_current_for_book_club_id(&self.model.id)
			.one(conn)
			.await?;

		Ok(book.map(BookClubBook::from))
	}

	/// The previous book that was read, if it exists
	async fn previous_book(&self, ctx: &Context<'_>) -> Result<Option<BookClubBook>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let book = book_club_book::Entity::find()
			.filter(book_club_book::Column::BookClubId.eq(&self.model.id))
			.filter(book_club_book::Column::CompletedAt.is_not_null())
			.order_by_desc(book_club_book::Column::CompletedAt)
			.one(conn)
			.await?;

		Ok(book.map(BookClubBook::from))
	}

	// TODO: Pagination
	/// All previous books that were read, ordered by completion date (most recent first)
	async fn previous_books(&self, ctx: &Context<'_>) -> Result<Vec<BookClubBook>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let books = book_club_book::Entity::find()
			.filter(book_club_book::Column::BookClubId.eq(&self.model.id))
			.filter(book_club_book::Column::CompletedAt.is_not_null())
			.order_by_desc(book_club_book::Column::CompletedAt)
			.all(conn)
			.await?;

		Ok(books.into_iter().map(BookClubBook::from).collect())
	}

	// TODO: Pagination
	/// All books in the club's queue, ordered by position
	async fn books(&self, ctx: &Context<'_>) -> Result<Vec<BookClubBook>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let books = book_club_book::Entity::find_for_book_club_id(&self.model.id)
			.all(conn)
			.await?;

		Ok(books.into_iter().map(BookClubBook::from).collect())
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

	async fn moderators(&self, ctx: &Context<'_>) -> Result<Vec<BookClubMember>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let book_club_members =
			book_club_member::Entity::find_members_accessible_to_user_for_book_club_id(
				user,
				&self.model.id.clone(),
			)
			.filter(book_club_member::Column::Role.eq(BookClubMemberRole::Moderator))
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

	/// Get discussions that are pinned for this book club
	async fn pinned_discussions(
		&self,
		ctx: &Context<'_>,
	) -> Result<Vec<BookClubDiscussion>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let discussions = book_club_discussion::Entity::find()
			.filter(book_club_discussion::Column::BookClubId.eq(&self.model.id))
			.filter(book_club_discussion::Column::IsPinned.eq(true))
			.order_by_asc(book_club_discussion::Column::CreatedAt)
			.all(conn)
			.await?;

		Ok(discussions
			.into_iter()
			.map(BookClubDiscussion::from)
			.collect())
	}

	async fn previous_discussions_count(&self, ctx: &Context<'_>) -> Result<u64> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let current_book_position =
			match book_club_book::Entity::get_current_or_next_position(
				&self.model.id,
				conn,
			)
			.await?
			{
				Some(pos) => pos,
				// No books exist at all, so there can be no previous discussions
				None => return Ok(0),
			};

		let count = book_club_discussion::Entity::find()
			.filter(book_club_discussion::Column::BookClubId.eq(&self.model.id))
			.filter(book_club_discussion::Column::IsPinned.eq(false))
			// If the discussion is linked to a book, it should only count if it is linked to a book BEFORE
			// the current book.
			.filter(
				book_club_discussion::Column::BookClubBookId
					.is_not_null()
					.and(
						book_club_discussion::Column::BookClubBookId.in_subquery(
							Query::select()
								.column(book_club_book::Column::Id)
								.from(book_club_book::Entity)
								.and_where(
									sea_orm::sea_query::Expr::col(
										book_club_book::Column::BookClubId,
									)
									.eq(self.model.id.clone()),
								)
								.and_where(
									sea_orm::sea_query::Expr::col(
										book_club_book::Column::Position,
									)
									.lt(current_book_position),
								)
								.take(),
						),
					),
			)
			.count(conn)
			.await?;

		Ok(count)
	}
}
