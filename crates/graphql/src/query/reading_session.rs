use async_graphql::{Context, Object, Result};
use models::entity::{book_club_member, reading_session};
use sea_orm::{prelude::*, sea_query::Query};

use crate::{
	data::{AuthContext, CoreContext},
	object::reading_session::ReadingSession,
};

#[derive(Default)]
pub struct ReadingSessionQuery;

#[Object]
impl ReadingSessionQuery {
	/// Finds a reading session by its ID, if it exists. Access control is enforced such that:
	/// - The session owner (i.e., the reader) can always access their own session
	/// - Other users can access the session if there are any progress-sharing rules in play
	///   (e.g., the session owner and the viewer share a book club membership with it enabled)
	async fn reading_session_by_id(
		&self,
		ctx: &Context<'_>,
		id: i32,
	) -> Result<Option<ReadingSession>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let Some(session) = reading_session::Entity::find_by_id(id).one(conn).await?
		else {
			return Ok(None);
		};

		// no need for any additional ac here, it is the user's session
		if session.user_id == user.id {
			return Ok(Some(ReadingSession::from(session)));
		}

		// the viewer AND the session owner must both be members of the same club, and
		// the session owner must opt-in to sharing their progress
		let has_shared_membership_with_access = book_club_member::Entity::find()
			// the session owner is a member of the club and shares progress
			.filter(
				book_club_member::Column::UserId
					.eq(session.user_id.clone())
					.and(book_club_member::Column::HideProgress.eq(false)),
			)
			// the viewer is a member of the same club
			.filter(
				book_club_member::Column::BookClubId.in_subquery(
					Query::select()
						.column(book_club_member::Column::BookClubId)
						.from(book_club_member::Entity)
						.and_where(book_club_member::Column::UserId.eq(user.id.clone()))
						.to_owned(),
				),
			)
			.count(conn)
			.await? > 0;

		if has_shared_membership_with_access {
			return Ok(Some(ReadingSession::from(session)));
		}

		Ok(None)
	}
}
