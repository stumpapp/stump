use async_graphql::{Context, Object, Result, ID};
use models::entity::{
	book_club, book_club_book, book_club_discussion, book_club_discussion_message,
	book_club_member, user::AuthUser,
};
use sea_orm::{
	prelude::*, sea_query::Query, ColumnTrait, QueryFilter, QueryOrder, QuerySelect,
};

use crate::{
	data::{AuthContext, CoreContext},
	object::{
		book_club_discussion::BookClubDiscussion,
		book_club_discussion_message::BookClubDiscussionMessage,
	},
	pagination::{CursorPaginatedResponse, CursorPagination, CursorPaginationInfo},
};

#[derive(Default)]
pub struct BookClubDiscussionQuery;

#[Object]
impl BookClubDiscussionQuery {
	/// Get a discussion by ID
	async fn book_club_discussion(
		&self,
		ctx: &Context<'_>,
		id: ID,
	) -> Result<BookClubDiscussion> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let discussion = book_club_discussion::Entity::find_by_id(id.as_ref())
			.one(conn)
			.await?
			.ok_or("Discussion not found")?;

		verify_read_access(&discussion.book_club_id, user, conn).await?;

		Ok(discussion.into())
	}

	/// Get the discussions by the book they're associated with
	async fn book_club_discussion_by_book(
		&self,
		ctx: &Context<'_>,
		book_club_book_id: ID,
	) -> Result<Vec<BookClubDiscussion>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let book = book_club_book::Entity::find_by_id(book_club_book_id.as_ref())
			.one(conn)
			.await?
			.ok_or("Book not found")?;

		verify_read_access(&book.book_club_id, user, conn).await?;

		let discussion = book_club_discussion::Entity::find()
			.filter(
				book_club_discussion::Column::BookClubBookId
					.eq(book_club_book_id.as_ref()),
			)
			.all(conn)
			.await?;

		Ok(discussion
			.into_iter()
			.map(BookClubDiscussion::from)
			.collect())
	}

	/// Get all discussions for a book club, ordered by pinned first, then by date created
	async fn book_club_discussions(
		&self,
		ctx: &Context<'_>,
		book_club_id: ID,
	) -> Result<Vec<BookClubDiscussion>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		verify_read_access(book_club_id.as_ref(), user, conn).await?;

		let discussions = book_club_discussion::Entity::find()
			.filter(book_club_discussion::Column::BookClubId.eq(book_club_id.as_ref()))
			.order_by_desc(book_club_discussion::Column::IsPinned)
			.order_by_asc(book_club_discussion::Column::CreatedAt)
			.all(conn)
			.await?;

		Ok(discussions
			.into_iter()
			.map(BookClubDiscussion::from)
			.collect())
	}

	/// Get a single message by ID
	async fn book_club_discussion_message(
		&self,
		ctx: &Context<'_>,
		id: ID,
	) -> Result<BookClubDiscussionMessage> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let message = book_club_discussion_message::Entity::find_by_id(id.as_ref())
			.one(conn)
			.await?
			.ok_or("Message not found")?;

		let discussion = book_club_discussion::Entity::find_by_id(&message.discussion_id)
			.one(conn)
			.await?
			.ok_or("Discussion not found")?;

		verify_read_access(&discussion.book_club_id, user, conn).await?;

		Ok(message.into())
	}

	/// Get messages in a discussion
	async fn book_club_discussion_messages(
		&self,
		ctx: &Context<'_>,
		discussion_id: ID,
		parent_id: Option<ID>,
		#[graphql(default)] pagination: CursorPagination,
	) -> Result<CursorPaginatedResponse<BookClubDiscussionMessage>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let discussion = book_club_discussion::Entity::find_by_id(discussion_id.as_ref())
			.one(conn)
			.await?
			.ok_or("Discussion not found")?;

		verify_read_access(&discussion.book_club_id, user, conn).await?;

		let mut query = book_club_discussion_message::Entity::find()
			.filter(
				book_club_discussion_message::Column::DiscussionId
					.eq(discussion_id.as_ref()),
			)
			.filter(book_club_discussion_message::Column::DeletedAt.is_null());

		if let Some(parent_id) = parent_id {
			query = query.filter(
				book_club_discussion_message::Column::ParentMessageId
					.eq(parent_id.as_ref()),
			);
		} else {
			query = query.filter(
				book_club_discussion_message::Column::ParentMessageId
					.is_null()
					.or(book_club_discussion_message::Column::IsPinnedMessage.eq(true)),
			);
		}

		query = query
			.order_by_desc(book_club_discussion_message::Column::IsPinnedMessage)
			.order_by_desc(book_club_discussion_message::Column::Timestamp);

		let limit = pagination.limit.min(100);
		// Note: In other areas I do more compelx cursoring but since this is a dual order by
		// this should be fine for now. TODO: Revisit this in future
		if let Some(after) = &pagination.after {
			query =
				query.filter(book_club_discussion_message::Column::Id.gt(after.as_str()));
		}

		let messages = query.limit(limit).all(conn).await?;

		let current_cursor = pagination
			.after
			.or_else(|| messages.first().map(|m| m.id.clone()));

		let next_cursor = match messages.last().map(|m| m.id.clone()) {
			Some(id) if messages.len() == limit as usize => Some(id),
			_ => None,
		};

		Ok(CursorPaginatedResponse {
			nodes: messages
				.into_iter()
				.map(BookClubDiscussionMessage::from)
				.collect(),
			cursor_info: CursorPaginationInfo {
				current_cursor,
				next_cursor,
				limit,
			},
		})
	}

	async fn previous_book_club_discussions(
		&self,
		ctx: &Context<'_>,
		book_club_id: ID,
	) -> Result<Vec<BookClubDiscussion>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let current_book_position =
			match book_club_book::Entity::get_current_or_next_position(
				book_club_id.as_ref(),
				conn,
			)
			.await?
			{
				Some(pos) => pos,
				// No books exist at all, so there can be no previous discussions
				None => return Ok(vec![]),
			};

		let discussions = book_club_discussion::Entity::find()
			.filter(book_club_discussion::Column::BookClubId.eq(book_club_id.as_ref()))
			.filter(book_club_discussion::Column::IsPinned.eq(false))
			// If the discussion is linked to a book, it should only be included if it is linked to a book BEFORE
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
									.eq(book_club_id.as_ref()),
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
			.order_by_desc(book_club_discussion::Column::CreatedAt)
			.all(conn)
			.await?;

		Ok(discussions
			.into_iter()
			.map(BookClubDiscussion::from)
			.collect())
	}
}

async fn verify_read_access(
	book_club_id: &str,
	user: &AuthUser,
	conn: &DatabaseConnection,
) -> Result<()> {
	if user.is_server_owner {
		return Ok(());
	}

	let is_member = book_club_member::Entity::find_by_club_for_user(user, book_club_id)
		.one(conn)
		.await?
		.is_some();

	if is_member {
		return Ok(());
	}

	let is_public = book_club::Entity::find_by_id(book_club_id)
		.filter(book_club::Column::IsPrivate.eq(false))
		.one(conn)
		.await?
		.is_some();

	if is_public {
		Ok(())
	} else {
		Err("You must be a member of the book club to access this discussion".into())
	}
}
