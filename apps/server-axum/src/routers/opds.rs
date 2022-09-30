use axum::{routing::get, Router};

pub(crate) fn mount() -> Router {
	Router::new().route("/", get(|| async { "OPDS: /" }))
}
