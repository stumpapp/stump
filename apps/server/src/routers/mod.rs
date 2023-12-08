use std::env;

use axum::Router;

use crate::config::state::AppState;

mod api;
mod opds;
mod spa;
mod sse;
mod utoipa;
mod ws;

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	let mut app_router = Router::new();

	let enable_swagger =
		env::var("ENABLE_SWAGGER_UI").unwrap_or_else(|_| String::from("true"));
	if enable_swagger != "false" || app_state.config.is_debug() {
		app_router = app_router.merge(utoipa::mount(app_state.clone()));
	}

	app_router
		.merge(spa::mount(app_state.clone()))
		.merge(ws::mount())
		.merge(sse::mount())
		.merge(api::mount(app_state.clone()))
		.merge(opds::mount(app_state))
}
