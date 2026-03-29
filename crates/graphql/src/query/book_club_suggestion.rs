use async_graphql::{Context, Object, Result, ID};
use models::{
	entity::{book_club, book_club_book_suggestion},
	shared::book_club::BookClubSuggestionStatus,
};
use sea_orm::{prelude::*, ColumnTrait, QueryFilter, QueryOrder, QueryTrait};

use crate::{
	data::{AuthContext, CoreContext},
	object::book_club_book_suggestion::BookClubBookSuggestion,
};

#[derive(Default)]
pub struct BookClubSuggestionQuery;

#[Object]
impl BookClubSuggestionQuery {
	/// Get all suggestions for a book club
	async fn book_club_suggestions(
		&self,
		ctx: &Context<'_>,
		book_club_id: ID,
		status: Option<BookClubSuggestionStatus>,
	) -> Result<Vec<BookClubBookSuggestion>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		book_club::Entity::find_by_id_and_user(book_club_id.as_ref(), user)
			.one(conn)
			.await?
			.ok_or("Book club not found or you don't have access")?;

		let suggestions = book_club_book_suggestion::Entity::find()
			.filter(
				book_club_book_suggestion::Column::BookClubId.eq(book_club_id.as_ref()),
			)
			.apply_if(status, |query, status| {
				query.filter(book_club_book_suggestion::Column::Status.eq(status))
			})
			.order_by_desc(book_club_book_suggestion::Column::CreatedAt)
			.all(conn)
			.await?;

		Ok(suggestions
			.into_iter()
			.map(BookClubBookSuggestion::from)
			.collect())
	}

	/// Get a single suggestion by ID
	async fn book_club_suggestion(
		&self,
		ctx: &Context<'_>,
		suggestion_id: ID,
	) -> Result<BookClubBookSuggestion> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let suggestion =
			book_club_book_suggestion::Entity::find_by_id(suggestion_id.as_ref())
				.one(conn)
				.await?
				.ok_or("Suggestion not found")?;

		book_club::Entity::find_by_id_and_user(&suggestion.book_club_id, user)
			.one(conn)
			.await?
			.ok_or("You don't have access to this book club")?;

		Ok(suggestion.into())
	}
}
