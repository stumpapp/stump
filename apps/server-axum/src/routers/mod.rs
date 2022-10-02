use axum::Router;

mod api;
mod opds;
mod spa;
mod ws;

pub(crate) fn mount() -> Router {
	Router::new()
		.merge(spa::mount())
		.merge(ws::mount())
		.nest("/api", api::mount())
		.merge(opds::mount())
}
