use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use models::entity::{
	book_club_discussion, book_club_discussion_message, media, media_metadata,
};
use sea_orm::{prelude::*, ColumnTrait, EntityTrait, QueryFilter, QuerySelect};

use crate::data::CoreContext;
use crate::object::book_club_book::BookClubBook;

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct BookClubDiscussion {
	#[graphql(flatten)]
	model: book_club_discussion::Model,
}

impl From<book_club_discussion::Model> for BookClubDiscussion {
	fn from(model: book_club_discussion::Model) -> Self {
		Self { model }
	}
}

#[ComplexObject]
impl BookClubDiscussion {
	/// Get the book this discussion is for
	async fn book(&self, ctx: &Context<'_>) -> Result<Option<BookClubBook>> {
		let book_club_book_id = match &self.model.book_club_book_id {
			Some(id) => id,
			None => return Ok(None),
		};

		let core = ctx.data::<CoreContext>()?;

		let book = models::entity::book_club_book::Entity::find_by_id(book_club_book_id)
			.one(core.conn.as_ref())
			.await?;

		Ok(book.map(BookClubBook::from))
	}

	/// A display name for the discussion
	async fn display_name(&self, ctx: &Context<'_>) -> Result<String> {
		if let Some(ref title) = self.model.title {
			return Ok(title.clone());
		}

		if let Some(ref book_id) = self.model.book_club_book_id {
			let core = ctx.data::<CoreContext>()?;
			if let Some(book) =
				models::entity::book_club_book::Entity::find_by_id(book_id)
					.one(core.conn.as_ref())
					.await?
			{
				if let Some(ref title) = book.title {
					return Ok(title.clone());
				}

				if let Some(ref book_entity_id) = book.book_entity_id {
					let record = media::Entity::find_by_id(book_entity_id.clone())
						.left_join(media_metadata::Entity)
						.select_only()
						.column(media::Column::Name)
						.column(media_metadata::Column::Title)
						.filter(media::Column::Id.eq(book_entity_id.clone()))
						.into_tuple::<(Option<String>, Option<String>)>()
						.one(core.conn.as_ref())
						.await?;
					match record {
						Some((_, Some(title))) => return Ok(title),
						Some((Some(name), _)) => return Ok(name),
						_ => (),
					}
				}
			}
		}

		Ok("General".to_string())
	}

	/// Get the count of messages in this discussion (excluding deleted messages)
	/// TODO(dataloader): Create dataloader
	async fn message_count(&self, ctx: &Context<'_>) -> Result<i64> {
		let core = ctx.data::<CoreContext>()?;

		let count = book_club_discussion_message::Entity::find()
			.filter(book_club_discussion_message::Column::DiscussionId.eq(&self.model.id))
			.filter(book_club_discussion_message::Column::DeletedAt.is_null())
			.count(core.conn.as_ref())
			.await?;

		Ok(count as i64)
	}
}
