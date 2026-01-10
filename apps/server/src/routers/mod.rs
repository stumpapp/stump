use axum::Router;

use crate::config::state::AppState;

mod api;
mod koreader;
mod opds;
mod spa;

pub(crate) use api::v2::auth::enforce_max_sessions;
pub(crate) use spa::relative_favicon_path;

pub(crate) async fn mount(app_state: AppState) -> Router<AppState> {
	let mut app_router = Router::new();

	if app_state.config.enable_koreader_sync {
		app_router = app_router.merge(koreader::mount(app_state.clone()));
	}

	app_router
		.merge(spa::mount(app_state.clone()))
		.merge(api::mount(app_state.clone()).await)
		.merge(opds::mount(app_state))
}
