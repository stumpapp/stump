use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use models::entity::{
	book_club_discussion_message, book_club_discussion_message_like, book_club_member,
};
use sea_orm::{prelude::*, ColumnTrait, EntityTrait, QueryFilter};

use crate::data::CoreContext;
use crate::object::book_club_member::BookClubMember;

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct BookClubDiscussionMessage {
	#[graphql(flatten)]
	model: book_club_discussion_message::Model,
}

impl From<book_club_discussion_message::Model> for BookClubDiscussionMessage {
	fn from(model: book_club_discussion_message::Model) -> Self {
		Self { model }
	}
}

#[ComplexObject]
impl BookClubDiscussionMessage {
	/// Get the member who posted this message
	async fn member(&self, ctx: &Context<'_>) -> Result<Option<BookClubMember>> {
		let core = ctx.data::<CoreContext>()?;

		if let Some(ref member_id) = self.model.member_id {
			let member = book_club_member::Entity::find_by_id(member_id)
				.one(core.conn.as_ref())
				.await?;

			Ok(member.map(BookClubMember::from))
		} else {
			Ok(None)
		}
	}

	/// Get the count of likes on this message
	/// TODO(dataloader): Create dataloader
	async fn like_count(&self, ctx: &Context<'_>) -> Result<i64> {
		let core = ctx.data::<CoreContext>()?;

		let count = book_club_discussion_message_like::Entity::find()
			.filter(
				book_club_discussion_message_like::Column::MessageId.eq(&self.model.id),
			)
			.count(core.conn.as_ref())
			.await?;

		Ok(count as i64)
	}

	/// Check if the current user has liked this message
	async fn is_liked_by_me(&self, ctx: &Context<'_>) -> Result<bool> {
		let core = ctx.data::<CoreContext>()?;
		let auth_ctx = ctx.data::<crate::data::AuthContext>()?;

		let member = book_club_member::Entity::find_by_club_for_user(
			&auth_ctx.user,
			&self.model.book_club_id,
		)
		.one(core.conn.as_ref())
		.await?;

		if let Some(member) = member {
			let like = book_club_discussion_message_like::Entity::find()
				.filter(
					book_club_discussion_message_like::Column::MessageId
						.eq(&self.model.id),
				)
				.filter(
					book_club_discussion_message_like::Column::LikedById.eq(&member.id),
				)
				.one(core.conn.as_ref())
				.await?;

			Ok(like.is_some())
		} else {
			Ok(false)
		}
	}

	/// Get replies to this message
	/// TODO(dataloader): Create dataloader
	async fn replies(&self, ctx: &Context<'_>) -> Result<Vec<BookClubDiscussionMessage>> {
		let core = ctx.data::<CoreContext>()?;

		let replies = book_club_discussion_message::Entity::find()
			.filter(
				book_club_discussion_message::Column::ParentMessageId.eq(&self.model.id),
			)
			.filter(book_club_discussion_message::Column::DeletedAt.is_null())
			.all(core.conn.as_ref())
			.await?;

		Ok(replies
			.into_iter()
			.map(BookClubDiscussionMessage::from)
			.collect())
	}

	/// Get the count of replies to this message
	/// TODO(dataloader): Create dataloader
	async fn reply_count(&self, ctx: &Context<'_>) -> Result<i64> {
		let core = ctx.data::<CoreContext>()?;

		let count = book_club_discussion_message::Entity::find()
			.filter(
				book_club_discussion_message::Column::ParentMessageId.eq(&self.model.id),
			)
			.filter(book_club_discussion_message::Column::DeletedAt.is_null())
			.count(core.conn.as_ref())
			.await?;

		Ok(count as i64)
	}
}
