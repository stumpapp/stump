mod graphql;
pub(crate) mod v2;

use axum::Router;

use crate::config::state::AppState;

pub(crate) async fn mount(app_state: AppState) -> Router<AppState> {
	Router::new().nest(
		"/api",
		Router::new()
			.nest("/graphql", graphql::mount(app_state.clone()).await)
			.nest("/v2", v2::mount(app_state)),
	)
}
