use axum::Router;

use crate::config::state::AppState;

mod sync;

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new().nest("/koreader", sync::mount(app_state))
}
