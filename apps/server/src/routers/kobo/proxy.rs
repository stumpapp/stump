use std::{sync::LazyLock, time::Duration};

use axum::{
	body::{to_bytes, Body, Bytes},
	extract::{OriginalUri, Request},
	http::{header, HeaderMap, HeaderName, HeaderValue, StatusCode, Uri},
	response::Response,
};
use reqwest::{redirect::Policy, Client, Url};
use serde_json::{Map, Value};
use thiserror::Error;

const KOBO_STORE_BASE_URL: &str = "https://storeapi.kobo.com";
const KOBO_STORE_HOST: &str = "storeapi.kobo.com";
const MAX_REQUEST_BODY_SIZE: usize = 2 * 1024 * 1024;
const X_KOBO_SYNC: &str = "x-kobo-sync";
const X_KOBO_SYNCTOKEN: &str = "x-kobo-synctoken";

static KOBO_STORE_CLIENT: LazyLock<Client> = LazyLock::new(|| {
	Client::builder()
		.redirect(Policy::none())
		.connect_timeout(Duration::from_secs(5))
		.timeout(Duration::from_secs(60))
		.build()
		.expect("the fixed Kobo Store client configuration is valid")
});

#[derive(Debug, Error)]
pub enum KoboProxyError {
	#[error("The request URI is not inside the Kobo API key route")]
	InvalidUpstreamPath,
	#[error("Could not construct the fixed Kobo Store URL: {0}")]
	InvalidUpstreamUrl(String),
	#[error("The Kobo Store request body is too large or invalid: {0}")]
	InvalidBody(String),
	#[error("The raw Kobo Store sync token is not a valid header: {0}")]
	InvalidSyncToken(#[from] reqwest::header::InvalidHeaderValue),
	#[error("The Kobo Store request failed: {0}")]
	Request(#[from] reqwest::Error),
}

#[derive(Debug)]
pub struct KoboStoreResponse {
	status: StatusCode,
	headers: HeaderMap,
	body: Bytes,
}

impl KoboStoreResponse {
	pub fn status(&self) -> StatusCode {
		self.status
	}

	pub fn is_success(&self) -> bool {
		self.status.is_success()
	}

	pub fn should_continue(&self) -> bool {
		self.headers
			.get(X_KOBO_SYNC)
			.and_then(|value| value.to_str().ok())
			.is_some_and(|value| value.eq_ignore_ascii_case("continue"))
	}

	pub fn sync_token(&self) -> Option<&str> {
		self.headers
			.get(X_KOBO_SYNCTOKEN)
			.and_then(|value| value.to_str().ok())
	}

	pub fn json(&self) -> Result<Value, serde_json::Error> {
		serde_json::from_slice(&self.body)
	}

	/// Converts the upstream response without exposing its raw sync token.
	pub fn into_response(self) -> Response {
		let mut response = Response::new(Body::from(self.body));
		*response.status_mut() = self.status;

		for (name, value) in &self.headers {
			if should_return_header(name) {
				response.headers_mut().append(name.clone(), value.clone());
			}
		}

		response
	}
}

/// Proxies one device request to the fixed Kobo Store host.
pub async fn forward(
	request: Request,
	api_key: &str,
	raw_sync_token: Option<&str>,
) -> Result<KoboStoreResponse, KoboProxyError> {
	let original_uri = request
		.extensions()
		.get::<OriginalUri>()
		.map(|uri| uri.0.clone())
		.unwrap_or_else(|| request.uri().clone());
	let upstream_url = upstream_url(&original_uri, api_key)?;
	let (parts, body) = request.into_parts();
	let body = to_bytes(body, MAX_REQUEST_BODY_SIZE)
		.await
		.map_err(|error| KoboProxyError::InvalidBody(error.to_string()))?;
	let headers = forwarded_request_headers(&parts.headers, raw_sync_token)?;

	let response = KOBO_STORE_CLIENT
		.request(parts.method, upstream_url)
		.headers(headers)
		.body(body)
		.send()
		.await?;

	Ok(KoboStoreResponse {
		status: response.status(),
		headers: response.headers().clone(),
		body: response.bytes().await?,
	})
}

/// Preserves Kobo's resource map while replacing the endpoints implemented by Stump.
pub fn merge_initialization_resources(
	upstream: Option<Value>,
	overrides: Map<String, Value>,
) -> Value {
	let mut result = match upstream {
		Some(Value::Object(root))
			if root.get("Resources").is_some_and(Value::is_object) =>
		{
			Value::Object(root)
		},
		_ => Value::Object(Map::new()),
	};

	let root = result
		.as_object_mut()
		.expect("the initialization root is always an object");
	let resources = root
		.entry("Resources")
		.or_insert_with(|| Value::Object(Map::new()))
		.as_object_mut()
		.expect("Resources was validated or freshly created");
	resources.extend(overrides);

	result
}

fn upstream_url(uri: &Uri, api_key: &str) -> Result<Url, KoboProxyError> {
	let prefix = format!("/kobo/{api_key}");
	let path_and_query = uri
		.path_and_query()
		.map(|value| value.as_str())
		.unwrap_or_else(|| uri.path());
	let upstream_path = path_and_query
		.strip_prefix(&prefix)
		.filter(|path| path.is_empty() || path.starts_with('/'))
		.ok_or(KoboProxyError::InvalidUpstreamPath)?;
	let upstream_path = if upstream_path.is_empty() {
		"/"
	} else {
		upstream_path
	};
	let url = Url::parse(&format!("{KOBO_STORE_BASE_URL}{upstream_path}"))
		.map_err(|error| KoboProxyError::InvalidUpstreamUrl(error.to_string()))?;

	if url.host_str() != Some(KOBO_STORE_HOST) {
		return Err(KoboProxyError::InvalidUpstreamPath);
	}

	Ok(url)
}

fn forwarded_request_headers(
	headers: &HeaderMap,
	raw_sync_token: Option<&str>,
) -> Result<HeaderMap, KoboProxyError> {
	let mut forwarded = HeaderMap::new();

	for (name, value) in headers {
		if should_forward_request_header(name) {
			forwarded.append(name.clone(), value.clone());
		}
	}

	if let Some(raw_sync_token) = raw_sync_token.filter(|token| !token.is_empty()) {
		forwarded.insert(X_KOBO_SYNCTOKEN, HeaderValue::from_str(raw_sync_token)?);
	}

	Ok(forwarded)
}

fn should_forward_request_header(name: &HeaderName) -> bool {
	if name.as_str() == X_KOBO_SYNCTOKEN {
		return false;
	}

	name == header::AUTHORIZATION
		|| name == header::USER_AGENT
		|| name == header::ACCEPT
		|| name == header::ACCEPT_LANGUAGE
		|| name == header::CONTENT_TYPE
		|| name.as_str().starts_with("x-kobo-")
}

fn should_return_header(name: &HeaderName) -> bool {
	if name.as_str() == X_KOBO_SYNCTOKEN {
		return false;
	}

	name == header::CONTENT_TYPE
		|| name == header::LOCATION
		|| name.as_str().starts_with("x-kobo-")
}

#[cfg(test)]
mod tests {
	use axum::http::HeaderValue;
	use serde_json::json;

	use super::*;

	#[test]
	fn constructs_fixed_upstream_url_without_api_key() {
		let url = upstream_url(
			&"/kobo/stump_secret/v1/library/sync?foo=a%2Fb"
				.parse()
				.expect("valid URI"),
			"stump_secret",
		)
		.expect("valid upstream URL");

		assert_eq!(
			url.as_str(),
			"https://storeapi.kobo.com/v1/library/sync?foo=a%2Fb"
		);
		assert!(!url.as_str().contains("stump_secret"));
	}

	#[test]
	fn rejects_paths_outside_the_api_key_route() {
		let error = upstream_url(
			&"/kobo/stump_secret_other/v1/library/sync"
				.parse()
				.expect("valid URI"),
			"stump_secret",
		)
		.expect_err("prefix collision must be rejected");

		assert!(matches!(error, KoboProxyError::InvalidUpstreamPath));
	}

	#[test]
	fn forwards_only_store_headers_and_replaces_sync_token() {
		let mut headers = HeaderMap::new();
		headers.insert(
			header::AUTHORIZATION,
			HeaderValue::from_static("Bearer token"),
		);
		headers.insert("x-kobo-userkey", HeaderValue::from_static("user-key"));
		headers.insert(X_KOBO_SYNCTOKEN, HeaderValue::from_static("stump-token"));
		headers.insert(header::COOKIE, HeaderValue::from_static("private=1"));
		headers.insert(header::HOST, HeaderValue::from_static("stump.local"));

		let forwarded = forwarded_request_headers(&headers, Some("store-token"))
			.expect("headers should be valid");

		assert_eq!(
			forwarded.get(header::AUTHORIZATION).unwrap(),
			"Bearer token"
		);
		assert_eq!(forwarded.get("x-kobo-userkey").unwrap(), "user-key");
		assert_eq!(forwarded.get(X_KOBO_SYNCTOKEN).unwrap(), "store-token");
		assert!(!forwarded.contains_key(header::COOKIE));
		assert!(!forwarded.contains_key(header::HOST));
	}

	#[test]
	fn preserves_upstream_resources_and_overrides_local_values() {
		let upstream = json!({
			"Resources": {
				"image_url_template": "https://cdn.kobo.com/old",
				"reading_services_host": "https://readingservices.kobo.com"
			},
			"Other": true
		});
		let overrides = Map::from_iter([(
			"image_url_template".to_string(),
			json!("https://stump.local/image"),
		)]);

		let merged = merge_initialization_resources(Some(upstream), overrides);

		assert_eq!(merged["Other"], true);
		assert_eq!(
			merged["Resources"]["reading_services_host"],
			"https://readingservices.kobo.com"
		);
		assert_eq!(
			merged["Resources"]["image_url_template"],
			"https://stump.local/image"
		);
	}

	#[test]
	fn invalid_initialization_uses_an_object_fallback() {
		let merged = merge_initialization_resources(
			Some(json!([{"Resources": {}}])),
			Map::from_iter([("library_sync".to_string(), json!("local"))]),
		);

		assert!(merged.is_object());
		assert_eq!(merged["Resources"]["library_sync"], "local");
	}

	#[test]
	fn response_filters_raw_sync_token() {
		let mut headers = HeaderMap::new();
		headers.insert(
			header::CONTENT_TYPE,
			HeaderValue::from_static("application/json"),
		);
		headers.insert(
			header::LOCATION,
			HeaderValue::from_static("https://kobo.com"),
		);
		headers.insert(X_KOBO_SYNC, HeaderValue::from_static("continue"));
		headers.insert(X_KOBO_SYNCTOKEN, HeaderValue::from_static("raw-token"));
		headers.insert(header::SET_COOKIE, HeaderValue::from_static("private=1"));
		let response = KoboStoreResponse {
			status: StatusCode::UNAUTHORIZED,
			headers,
			body: Bytes::from_static(b"[]"),
		};

		assert!(response.should_continue());
		assert_eq!(response.sync_token(), Some("raw-token"));
		let response = response.into_response();

		assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
		assert_eq!(
			response.headers().get(header::CONTENT_TYPE).unwrap(),
			"application/json"
		);
		assert!(response.headers().contains_key(header::LOCATION));
		assert!(response.headers().contains_key(X_KOBO_SYNC));
		assert!(!response.headers().contains_key(X_KOBO_SYNCTOKEN));
		assert!(!response.headers().contains_key(header::SET_COOKIE));
	}
}
