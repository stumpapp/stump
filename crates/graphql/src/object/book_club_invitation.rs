use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use models::{
	entity::{book_club, book_club_invitation, user},
	shared::enums::UserPermission,
};
use sea_orm::EntityTrait;

use crate::{
	data::CoreContext,
	guard::{PermissionGuard, SelfGuard},
};

use super::{book_club::BookClub, user::User};

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct BookClubInvitation {
	#[graphql(flatten)]
	model: book_club_invitation::Model,
}

impl From<book_club_invitation::Model> for BookClubInvitation {
	fn from(model: book_club_invitation::Model) -> Self {
		Self { model }
	}
}

#[ComplexObject]
impl BookClubInvitation {
	// TODO(authorization): I think if you have been invited you have temp access to the book club node,
	// but it would be good to ask folks how they feel about this. The only way to have access is via
	// an invitation node, though. I think this is fairly secure.
	/// The book club that the user was invited to
	async fn book_club(&self, ctx: &Context<'_>) -> Result<BookClub> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let book_club = book_club::Entity::find_by_id(&self.model.book_club_id)
			.one(conn)
			.await?
			.ok_or("Book club not found")?;

		Ok(book_club.into())
	}

	/// The user who was invited to the book club
	#[graphql(
		guard = "SelfGuard::new(&self.model.user_id).or(PermissionGuard::one(UserPermission::ReadUsers))"
	)]
	async fn user(&self, ctx: &Context<'_>) -> Result<User> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let invitee = user::Entity::find_by_id(&self.model.user_id)
			.one(conn)
			.await?
			.ok_or("User not found")?;

		Ok(invitee.into())
	}
}
