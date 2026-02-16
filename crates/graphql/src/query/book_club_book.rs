use async_graphql::{Context, Object, Result, ID};
use models::entity::book_club_book;
use sea_orm::prelude::*;

use crate::{
	data::{AuthContext, CoreContext},
	object::book_club_book::BookClubBook,
};

#[derive(Default)]
pub struct BookClubBookQuery;

#[Object]
impl BookClubBookQuery {
	/// Get a club book by ID
	async fn book_club_book(&self, ctx: &Context<'_>, id: ID) -> Result<BookClubBook> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let book = book_club_book::Entity::find_by_id(id.as_ref())
			.one(conn)
			.await?
			.ok_or("Book not found")?;

		// TODO: Verify access needed

		Ok(book.into())
	}
}
