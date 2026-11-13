use async_graphql::{Context, ID, Object, Result};
use models::{
	entity::{book_club_book, media},
	shared::enums::UserPermission,
};
use sea_orm::{QuerySelect, prelude::*};

use crate::{
	data::{AuthContext, CoreContext},
	guard::PermissionGuard,
	object::{book_club::verify_read_access, book_club_book::BookClubBook},
};

#[derive(Default)]
pub struct BookClubBookQuery;

#[Object]
impl BookClubBookQuery {
	/// Get a club book by ID
	#[graphql(guard = "PermissionGuard::one(UserPermission::AccessBookClub)")]
	async fn book_club_book(&self, ctx: &Context<'_>, id: ID) -> Result<BookClubBook> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let mut book = book_club_book::Entity::find_by_id(id.as_ref())
			.one(conn)
			.await?
			.ok_or("Book not found")?;

		verify_read_access(&book.book_club_id, user, conn).await?;

		if let Some(ref entity_id) = book.book_entity_id {
			// Note: _Technically_ this could also fail if the book doesn't exist, which is
			// why I used "accessible" language. I don't think it really matters if the book
			// doesn't exist, what matters is if the user cannot access it we don't return details
			let accessible = media::Entity::apply_for_user(
				user,
				media::Entity::find().filter(media::Column::Id.eq(entity_id.clone())),
			)
			.select_only()
			.column(media::Column::Id)
			.into_tuple::<Option<String>>()
			.one(conn)
			.await?
			.is_some();

			if !accessible {
				book.sanitize_entity();
			}
		}

		Ok(book.into())
	}
}
