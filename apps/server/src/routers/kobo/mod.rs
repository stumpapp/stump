use axum::Router;

use crate::config::state::AppState;

mod router;
mod sync;
mod sync_token;

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new().nest("/kobo", router::mount(app_state))
}
