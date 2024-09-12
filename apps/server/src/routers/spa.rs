use std::{
	convert::Infallible,
	future::Future,
	path::Path,
	pin::Pin,
	sync::Arc,
	task::{Context, Poll},
};

use axum::{
	body::Body,
	extract::State,
	http::{HeaderMap, Request, Response, StatusCode},
	response::IntoResponse,
	routing::get,
	Router,
};
use once_cell::sync::OnceCell;
use tower::Service;
use tower_http::services::{ServeDir, ServeFile};

use crate::{
	asset_resolver::AssetResolverExt,
	config::state::AppState,
	errors::{APIError, APIResult},
};

// pub static RESOURCE_FETCHER: OnceCell<Option<Arc<dyn AssetResolverExt>>> =
// 	OnceCell::new();

pub const FAVICON: &str = "/favicon.ico";
const ASSETS: &str = "/assets";
const DIST: &str = "/dist";

pub(crate) fn mount(
	app_state: AppState,
	resource_fetcher: Option<Arc<impl AssetResolverExt>>,
) -> Router<AppState> {
	if let Some(resource_fetcher) = resource_fetcher {
		// RESOURCE_FETCHER
		// 	.set(Some(resource_fetcher))
		// 	.unwrap_or_else(|_| {
		// 		tracing::debug!("Resource fetcher already set");
		// 	});

		mount_resource_fetcher_service()
	} else {
		let dist_path = Path::new(&app_state.config.client_dir);

		Router::new()
			// FIXME: figure out why this doesn't work... The workaround is yucky stinky
			// .route_service(
			// 	"/favicon.ico",
			// 	ServeFile::new(dist_path.join("favicon.ico")),
			// )
			.route(FAVICON, get(favicon))
			.nest_service(ASSETS, ServeDir::new(dist_path.join("assets")))
			.nest_service(DIST, ServeDir::new(dist_path))
			.fallback_service(ServeFile::new(dist_path.join("index.html")))
	}
}

pub(crate) fn relative_favicon_path() -> String {
	format!("{}{}", ASSETS, FAVICON)
}

// https://github.com/tokio-rs/axum/discussions/608#discussioncomment-7772294
async fn favicon(
	State(ctx): State<AppState>,
	headers: HeaderMap,
) -> APIResult<impl IntoResponse> {
	let mut req = Request::new(Body::empty());
	*req.headers_mut() = headers;
	match ServeFile::new(Path::new(&ctx.config.client_dir).join("favicon.ico"))
		.try_call(req)
		.await
	{
		Ok(res) => Ok(res),
		Err(e) => {
			tracing::error!(error = ?e, "Error serving favicon");
			Err(APIError::InternalServerError(e.to_string()))
		},
	}
}

// TODO(desktop): if there exists a resource_fetcher in the app_state, we need to use that with a custom
// service instead. The resource_fetcher is used to fetch resources from the bundled react app
// in the Tauri app, which kicks off the server (optionally)
fn mount_resource_fetcher_service() -> Router<AppState> {
	Router::new()
		.nest_service(FAVICON, ResourceFetcherService {})
		.nest_service(ASSETS, ResourceFetcherService {})
		.nest_service(DIST, ResourceFetcherService {})
}

// A service that fetches resources from the bundled react app in the Tauri app
// It supports paths matching:
// - /favicon.ico
// - /assets/*
// - / (index.html)
// Any other path will send the index.html file
#[derive(Clone)]
struct ResourceFetcherService;

impl Service<Request<Body>> for ResourceFetcherService {
	type Response = Response<Body>;
	type Error = Infallible;
	type Future =
		Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

	fn poll_ready(&mut self, _cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
		Poll::Ready(Ok(()))
	}

	fn call(&mut self, req: Request<Body>) -> Self::Future {
		// // create the body
		// let body: Vec<u8> = "hello, world!\n".as_bytes().to_owned();
		// // Create the HTTP response
		// let resp = Response::builder()
		// 	.status(StatusCode::OK)
		// 	.body(body)
		// 	.expect("Unable to create `http::Response`");

		// // create a response in a future.
		// let fut = async { Ok(resp.map(|body| body.into())) };

		// // Return the response as an immediate future
		// Box::pin(fut)

		// let resource_fetcher = RESOURCE_FETCHER.get().unwrap();
		// let path = req.uri().path();
		// let resource = resource_fetcher.as_ref().unwrap()(path.to_string());

		// let Some((content_type, body)) = resource else {
		// 	return Box::pin(async {
		// 		Ok(Response::builder()
		// 			.status(StatusCode::NOT_FOUND)
		// 			.body(Body::empty())
		// 			.unwrap())
		// 	});
		// };

		// let resp = Response::builder()
		// 	.status(StatusCode::OK)
		// 	.header("content-type", content_type)
		// 	.body(body.into())
		// 	.expect("Unable to create `http::Response`");

		// Box::pin(async { Ok(resp) })

		unimplemented!()
	}
}
