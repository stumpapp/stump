use axum::Router;

mod auth;

pub(crate) fn mount() -> Router {
	Router::new().merge(auth::mount())
}
