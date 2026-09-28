use async_graphql::{Context, Object, Result};
use models::entity::reading_session;
use sea_orm::prelude::*;

use crate::{
	data::{AuthContext, CoreContext},
	object::reading_session::ReadingSession,
};

#[derive(Default)]
pub struct ReadingSessionQuery;

#[Object]
impl ReadingSessionQuery {
	// TODO: guard against users trying to access session not theirs
	// will have to account for some future features like clubs where users
	// can share activity etc
	async fn reading_session_by_id(
		&self,
		ctx: &Context<'_>,
		id: i32,
	) -> Result<Option<ReadingSession>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		// TODO: ^ rm if unsused once address access control
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		// TODO(reading-timeline): access control
		let session = reading_session::Entity::find_by_id(id)
			.one(conn)
			.await?
			.map(ReadingSession::from);

		Ok(session)
	}
}
