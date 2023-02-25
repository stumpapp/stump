use axum::Router;

use crate::config::state::AppState;

pub(crate) mod v1;

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new().nest("/api", Router::new().nest("/v1", v1::mount(app_state)))
}
