use axum::Router;

use crate::config::state::AppState;

mod v1;

pub(crate) fn mount() -> Router<AppState> {
	Router::new().nest("/v1", v1::mount())
}
