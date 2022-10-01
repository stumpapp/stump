use axum_extra::routing::SpaRouter;

pub(crate) fn mount() -> SpaRouter {
	SpaRouter::new("/assets", "./dist/assets").index_file("../index.html")
}
