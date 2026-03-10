use async_graphql::{Context, Object, Result};
use models::entity::book_club_invitation;

use crate::{
	data::{AuthContext, CoreContext},
	object::book_club_invitation::BookClubInvitation,
};

#[derive(Default)]
pub struct BookClubInvitationQuery;

#[Object]
impl BookClubInvitationQuery {
	/// Get all pending invitations for the current user
	async fn my_book_club_invitations(
		&self,
		ctx: &Context<'_>,
	) -> Result<Vec<BookClubInvitation>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let invitations = book_club_invitation::Entity::find_for_user(user)
			.all(conn)
			.await?;

		Ok(invitations
			.into_iter()
			.map(BookClubInvitation::from)
			.collect())
	}
}
