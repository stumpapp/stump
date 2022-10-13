use axum::{
	body::{Body, Bytes},
	http::Request,
	middleware::Next,
	response::IntoResponse,
};
use stump_core::config::logging::get_log_verbosity;

use crate::errors::ApiResult;

pub(crate) async fn logging_middleware(
	req: Request<Body>,
	next: Next<Body>,
) -> ApiResult<impl IntoResponse> {
	if get_log_verbosity() < 3 {
		return Ok(next.run(req).await);
	}

	let (parts, body) = req.into_parts();

	let method = parts.method.as_ref();
	let uri = parts.uri.to_string();

	let bytes = get_buffer(body).await;
	let mut body = None;
	if !bytes.is_empty() {
		body = match std::str::from_utf8(&bytes) {
			Ok(s) => Some(s.to_string()),
			Err(_) => None,
		};
	}

	tracing::trace!(?method, ?uri, ?body, "HTTP Request");

	let req = Request::from_parts(parts, Body::from(bytes));

	// let res = next.run(req).await;

	// let (parts, body) = res.into_parts();
	// let bytes = get_buffer(body).await?;
	// let res = Response::from_parts(parts, Body::from(bytes));

	// Ok(res)

	Ok(next.run(req).await)
}

async fn get_buffer<B>(body: B) -> Bytes
where
	B: axum::body::HttpBody<Data = Bytes>,
	B::Error: std::fmt::Display,
{
	hyper::body::to_bytes(body).await.unwrap_or_else(|e| {
		tracing::error!("error buffering body: {}", e);

		Bytes::new()
	})
}
