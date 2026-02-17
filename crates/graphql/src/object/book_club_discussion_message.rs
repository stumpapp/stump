use std::collections::HashMap;

use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use models::entity::{
	book_club_discussion_message, book_club_discussion_message_reaction, book_club_member,
};
use sea_orm::{prelude::*, ColumnTrait, EntityTrait, QueryFilter, QuerySelect};

use crate::data::CoreContext;
use crate::object::book_club_member::BookClubMember;

#[derive(Debug, SimpleObject)]
pub struct AggregatedReaction {
	pub emoji: Option<String>,
	pub custom_emoji_id: Option<i32>,
	pub count: i64,
	pub reacted_by_me: bool,
}

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct BookClubDiscussionMessage {
	#[graphql(flatten)]
	pub(crate) model: book_club_discussion_message::Model,
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

	/// Get aggregated reactions for this message, grouped by emoji, sorted by count desc
	/// TODO(dataloader): Create dataloader
	async fn reactions(&self, ctx: &Context<'_>) -> Result<Vec<AggregatedReaction>> {
		let core = ctx.data::<CoreContext>()?;
		let auth_ctx = ctx.data::<crate::data::AuthContext>()?;

		let my_member_id = book_club_member::Entity::find_by_club_for_user(
			&auth_ctx.user,
			&self.model.book_club_id,
		)
		.one(core.conn.as_ref())
		.await?
		.map(|m| m.id);

		// TODO: I was too lazy to try and do this in SQL but I should revisit this
		let all_reactions = book_club_discussion_message_reaction::Entity::find()
			.filter(
				book_club_discussion_message_reaction::Column::MessageId
					.eq(&self.model.id),
			)
			.all(core.conn.as_ref())
			.await?;

		let mut reaction_map: HashMap<(Option<String>, Option<i32>), (i64, bool)> =
			HashMap::new();

		for reaction in &all_reactions {
			let key = (reaction.emoji.clone(), reaction.custom_emoji_id);
			let entry = reaction_map.entry(key).or_insert((0, false));
			entry.0 += 1;
			if my_member_id.as_ref() == Some(&reaction.member_id) {
				entry.1 = true;
			}
		}

		let mut results: Vec<AggregatedReaction> = reaction_map
			.into_iter()
			.map(|((emoji, custom_emoji_id), (count, reacted_by_me))| {
				AggregatedReaction {
					emoji,
					custom_emoji_id,
					count,
					reacted_by_me,
				}
			})
			.collect();

		results.sort_by(|a, b| b.count.cmp(&a.count));

		Ok(results)
	}

	/// Get the message this message is an inline reply to (if any)
	async fn reply_to(
		&self,
		ctx: &Context<'_>,
	) -> Result<Option<BookClubDiscussionMessage>> {
		let reply_to_id = match &self.model.reply_to_message_id {
			Some(id) => id,
			None => return Ok(None),
		};

		let core = ctx.data::<CoreContext>()?;

		let message = book_club_discussion_message::Entity::find_by_id(reply_to_id)
			.one(core.conn.as_ref())
			.await?;

		Ok(message.map(BookClubDiscussionMessage::from))
	}

	/// Get the threaded replies to this message (if any)
	/// TODO(dataloader): Create dataloader
	async fn thread_children(
		&self,
		ctx: &Context<'_>,
	) -> Result<Vec<BookClubDiscussionMessage>> {
		let core = ctx.data::<CoreContext>()?;

		let children = book_club_discussion_message::Entity::find()
			.filter(
				book_club_discussion_message::Column::ParentMessageId.eq(&self.model.id),
			)
			.filter(book_club_discussion_message::Column::DeletedAt.is_null())
			.all(core.conn.as_ref())
			.await?;

		Ok(children
			.into_iter()
			.map(BookClubDiscussionMessage::from)
			.collect())
	}

	/// Get the count of threaded replies to this message (if any)
	/// TODO(dataloader): Create dataloader
	async fn thread_children_count(&self, ctx: &Context<'_>) -> Result<i64> {
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
