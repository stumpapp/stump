use axum::Router;

use crate::config::state::AppState;

mod api;
mod opds;
mod spa;
mod sse;
mod ws;

pub(crate) fn mount() -> Router<AppState> {
	Router::new()
		.merge(spa::mount())
		.merge(ws::mount())
		.merge(sse::mount())
		.merge(api::mount())
		.merge(opds::mount())
}
