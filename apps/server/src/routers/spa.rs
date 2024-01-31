use std::path::Path;

use axum_extra::routing::SpaRouter;

use crate::config::state::AppState;

// FIXME: I am not picking up the favicon.ico file in docker, but can't seem
// to replicate it locally...
pub(crate) fn mount(app_state: AppState) -> SpaRouter<AppState> {
	let dist_path = Path::new(&app_state.config.client_dir);

	SpaRouter::new("/assets", dist_path.join("assets")).index_file("../index.html")
}

// pub(crate) fn mount() -> Router {
// 	let dist = get_client_dir();
// 	let dist_path = Path::new(&dist);

// 	Router::new()
// 		.route(
// 			"/favicon.ico",
// 			get_service(ServeFile::new(dist_path.join("favicon.ico"))).handle_error(
// 				|_| async {
// 					Ok::<_, std::convert::Infallible>(axum::http::StatusCode::NOT_FOUND)
// 				},
// 			),
// 		)
// 		.merge(
// 			SpaRouter::new("/assets", dist_path.join("assets"))
// 				.index_file("../index.html"),
// 		)
// }
