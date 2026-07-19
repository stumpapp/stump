use axum::{
	extract::State, http::StatusCode, middleware, routing::delete, Extension, Router,
};
use graphql::data::AuthContext;
use models::entity::kobo_sync_session;
use sea_orm::prelude::*;

use crate::{
	config::state::AppState, errors::APIResult, middleware::auth::auth_middleware,
};

mod router;
mod sync;
mod sync_token;

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.nest("/kobo", router::mount(app_state.clone()))
		.route(
			"/api/v2/kobo/sync-sessions",
			delete(delete_kobo_sync_sessions),
		)
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
}

/// Delete all Kobo sync sessions for the current user, forcing a full re-sync
/// on the next connection
async fn delete_kobo_sync_sessions(
	Extension(req): Extension<AuthContext>,
	State(ctx): State<AppState>,
) -> APIResult<StatusCode> {
	let user = req.user();
	kobo_sync_session::Entity::delete_many()
		.filter(kobo_sync_session::Column::UserId.eq(user.id.clone()))
		.exec(ctx.conn.as_ref())
		.await?;
	Ok(StatusCode::NO_CONTENT)
}
