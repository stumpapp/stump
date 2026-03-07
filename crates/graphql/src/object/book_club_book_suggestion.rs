use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use models::entity::{
	book_club_book_suggestion, book_club_book_suggestion_like, book_club_member,
};
use sea_orm::{prelude::*, ColumnTrait, EntityTrait, QueryFilter};

use crate::data::CoreContext;
use crate::object::book_club_member::BookClubMember;

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct BookClubBookSuggestion {
	#[graphql(flatten)]
	model: book_club_book_suggestion::Model,
}

impl From<book_club_book_suggestion::Model> for BookClubBookSuggestion {
	fn from(model: book_club_book_suggestion::Model) -> Self {
		Self { model }
	}
}

#[ComplexObject]
impl BookClubBookSuggestion {
	/// Get the member who suggested this book
	async fn suggested_by(&self, ctx: &Context<'_>) -> Result<BookClubMember> {
		let core = ctx.data::<CoreContext>()?;

		let member = book_club_member::Entity::find_by_id(&self.model.suggested_by_id)
			.one(core.conn.as_ref())
			.await?
			.ok_or("Member not found")?;

		Ok(BookClubMember::from(member))
	}

	/// Get the member who resolved this suggestion
	async fn resolved_by(&self, ctx: &Context<'_>) -> Result<Option<BookClubMember>> {
		let core = ctx.data::<CoreContext>()?;

		if let Some(ref resolved_by_id) = self.model.resolved_by_id {
			let member = book_club_member::Entity::find_by_id(resolved_by_id)
				.one(core.conn.as_ref())
				.await?;

			Ok(member.map(BookClubMember::from))
		} else {
			Ok(None)
		}
	}

	/// Get the count of likes (votes) on this suggestion
	/// TODO(dataloader): Create dataloader
	async fn like_count(&self, ctx: &Context<'_>) -> Result<i64> {
		let core = ctx.data::<CoreContext>()?;

		let count = book_club_book_suggestion_like::Entity::find()
			.filter(
				book_club_book_suggestion_like::Column::SuggestionId.eq(&self.model.id),
			)
			.count(core.conn.as_ref())
			.await?;

		Ok(count as i64)
	}

	/// Check if the current user has liked this suggestion
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
			let like = book_club_book_suggestion_like::Entity::find()
				.filter(
					book_club_book_suggestion_like::Column::SuggestionId
						.eq(&self.model.id),
				)
				.filter(book_club_book_suggestion_like::Column::LikedById.eq(&member.id))
				.one(core.conn.as_ref())
				.await?;

			Ok(like.is_some())
		} else {
			Ok(false)
		}
	}
}
