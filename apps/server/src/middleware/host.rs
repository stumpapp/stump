use async_trait::async_trait;
use axum::{
	extract::{FromRef, FromRequestParts, Host},
	http::{request::Parts, HeaderMap},
};
use reqwest::header::FORWARDED;
use stump_core::opds::v2_0::link::OPDSLinkFinalizer;

use crate::{config::state::AppState, errors::APIError};

const X_FORWARDED_PROTO_HEADER_KEY: &str = "X-Forwarded-Proto";

#[derive(Debug, Clone)]
pub struct HostDetails {
	pub host: String,
	pub scheme: String,
}

impl Default for HostDetails {
	fn default() -> Self {
		HostDetails {
			host: "localhost".to_string(),
			scheme: "http".to_string(),
		}
	}
}

impl HostDetails {
	pub fn url(&self) -> String {
		format!("{}://{}", self.scheme, self.host)
	}
}

impl From<HostDetails> for OPDSLinkFinalizer {
	fn from(details: HostDetails) -> Self {
		OPDSLinkFinalizer::new(details.url())
	}
}

#[derive(Debug, Clone)]
pub struct HostExtractor(pub HostDetails);

#[async_trait]
impl<S> FromRequestParts<S> for HostExtractor
where
	AppState: FromRef<S>,
	S: Send + Sync,
{
	type Rejection = APIError;

	async fn from_request_parts(
		parts: &mut Parts,
		state: &S,
	) -> Result<Self, Self::Rejection> {
		let host = Host::from_request_parts(parts, state)
			.await
			.map_err(|_| APIError::BadRequest("Invalid host".to_string()))?;
		let scheme = parse_scheme(parts).unwrap_or_else(|| {
			tracing::warn!(?host, "No scheme found in request, defaulting to http");
			"http".to_string()
		});

		Ok(HostExtractor(HostDetails {
			host: host.0,
			scheme,
		}))
	}
}

fn parse_scheme(parts: &mut Parts) -> Option<String> {
	if let Some(scheme) = parse_forwarded(&parts.headers) {
		return Some(scheme.to_string());
	}

	// X-Forwarded-Proto
	if let Some(scheme) = parts
		.headers
		.get(X_FORWARDED_PROTO_HEADER_KEY)
		.and_then(|scheme| scheme.to_str().ok())
	{
		return Some(scheme.to_string());
	}

	// From parts of an HTTP/2 request
	if let Some(scheme) = parts.uri.scheme_str() {
		return Some(scheme.to_string());
	}

	None
}

fn parse_forwarded(headers: &HeaderMap) -> Option<&str> {
	// if there are multiple `Forwarded` `HeaderMap::get` will return the first one
	let forwarded_values = headers.get(FORWARDED)?.to_str().ok()?;

	// get the first set of values
	let first_value = forwarded_values.split(',').next()?;

	// find the value of the `proto` field
	first_value.split(';').find_map(|pair| {
		let (key, value) = pair.split_once('=')?;
		key.trim()
			.eq_ignore_ascii_case("proto")
			.then(|| value.trim().trim_matches('"'))
	})
}

// TODO(281): Add tests for HostExtractor
