use axum::Router;

use crate::config::state::AppState;

pub(crate) mod v1_2;

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new().nest("/opds", Router::new().merge(v1_2::mount(app_state)))
}
