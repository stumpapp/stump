use async_graphql::{Context, Object, Result};
use models::entity::reading_session;
use sea_orm::{prelude::*, IntoActiveModel};

use crate::{
	data::{AuthContext, CoreContext},
	input::reading_session::PatchReadingSession,
	object::reading_session::ReadingSession,
};

/// A mutation root for reading sessions, not to be confused with the more media-progression-specific
/// ReadingProgressMutation
#[derive(Default)]
pub struct ReadingSessionMutation;

#[Object]
impl ReadingSessionMutation {
	/// Deletes a reading session for the authenticated user. Only the user who owns the session
	/// may delete it
	async fn delete_reading_session(
		&self,
		ctx: &Context<'_>,
		session_id: i32,
	) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let Some(session) = reading_session::Entity::find_for_user(user)
			.filter(reading_session::Column::Id.eq(session_id))
			.one(conn)
			.await?
		else {
			return Err("Session not found".into());
		};

		let session = session.into_active_model();
		session.delete(conn).await?;

		Ok(true)
	}

	/// Updates a reading session for the authenticated user, exposing a small
	/// set of fields which are editable
	async fn patch_reading_session(
		&self,
		ctx: &Context<'_>,
		session_id: i32,
		input: PatchReadingSession,
	) -> Result<ReadingSession> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let Some(session) = reading_session::Entity::find_for_user(user)
			.filter(reading_session::Column::Id.eq(session_id))
			.one(conn)
			.await?
		else {
			return Err("Session not found".into());
		};

		let session = input.apply(session);
		let session = session.update(conn).await?;

		Ok(ReadingSession::from(session))
	}
}
