use axum::Router;

use crate::config::state::AppState;

mod queries;
mod sync;
mod sync_types;

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new().nest("/kobo", sync::mount(app_state))
}
