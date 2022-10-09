use axum::Router;

mod api;
mod opds;
mod spa;
mod sse;
mod ws;

pub(crate) fn mount() -> Router {
	Router::new()
		.merge(spa::mount())
		.merge(ws::mount())
		.merge(sse::mount())
		.merge(api::mount())
		.merge(opds::mount())
}
