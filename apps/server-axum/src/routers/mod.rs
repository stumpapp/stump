use axum::Router;

mod api;
mod opds;
mod spa;

pub(crate) fn mount() -> Router {
	Router::new()
		.nest("/opds/v1.2", opds::mount())
		.nest("/api", api::mount())
}
