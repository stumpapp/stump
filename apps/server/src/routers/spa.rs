use std::path::Path;

use axum_extra::routing::SpaRouter;

use crate::config::{state::AppState, utils::get_client_dir};

// FIXME: I am not picking up the favicon.ico file in docker, but can't seem
// to replicate it locally...
pub(crate) fn mount() -> SpaRouter<AppState> {
	let dist = get_client_dir();
	let dist_path = Path::new(&dist);

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
