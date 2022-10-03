use std::{env, path::Path};

use axum_extra::routing::SpaRouter;

pub(crate) fn mount() -> SpaRouter {
	let dist = env::var("STUMP_CLIENT_DIR").unwrap_or_else(|_| "./dist".to_string());
	let dist_path = Path::new(&dist);

	SpaRouter::new("/assets", dist_path.join("assets")).index_file("../index.html")
}
