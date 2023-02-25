use axum::Router;

use crate::config::state::AppState;

mod api;
mod opds;
mod spa;
mod sse;
mod utoipa;
mod ws;

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.merge(utoipa::swagger_ui())
		.merge(spa::mount())
		.merge(ws::mount())
		.merge(sse::mount())
		.merge(api::mount(app_state.clone()))
		.merge(opds::mount(app_state))
}
