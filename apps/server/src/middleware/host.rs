use std::net::IpAddr;

use axum::{
	extract::{FromRef, FromRequestParts},
	http::{request::Parts, Extensions, HeaderMap},
};
use axum_extra::extract::Host;

use reqwest::header::FORWARDED;
use stump_core::opds::v2_0::link::OPDSLinkFinalizer;

use crate::{config::state::AppState, errors::APIError, http_server::StumpRequestInfo};

const X_FORWARDED_PROTO_HEADER_KEY: &str = "X-Forwarded-Proto";
const X_REAL_IP: &str = "X-Real-IP";
const X_FORWARDED_FOR: &str = "X-Forwarded-For";

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
		let app_state = AppState::from_ref(state);
		let trust_proxy_headers = app_state.config.trust_proxy_headers;

		let scheme = parse_scheme(parts, trust_proxy_headers).unwrap_or_else(|| {
			tracing::warn!(?host, "No scheme found in request, defaulting to http");
			"http".to_string()
		});

		Ok(HostExtractor(HostDetails {
			host: host.0,
			scheme,
		}))
	}
}

fn parse_scheme(parts: &mut Parts, trust_proxy_headers: bool) -> Option<String> {
	if trust_proxy_headers {
		if let Some(scheme) = parse_forwarded(&parts.headers) {
			return Some(scheme.to_string());
		}

		if let Some(scheme) = parts
			.headers
			.get(X_FORWARDED_PROTO_HEADER_KEY)
			.and_then(|scheme| scheme.to_str().ok())
		{
			return Some(scheme.to_string());
		}
	} else if parts.headers.contains_key(X_FORWARDED_PROTO_HEADER_KEY)
		|| parts.headers.contains_key(FORWARDED)
	{
		tracing::warn!(
			x_forwarded_proto_header = ?parts.headers.get(X_FORWARDED_PROTO_HEADER_KEY),
			forwarded_header = ?parts.headers.get(FORWARDED),
			"Proxy scheme headers present but trust_proxy_headers is false, ignoring scheme from headers"
		);
	}

	if let Some(scheme) = parts.uri.scheme_str() {
		return Some(scheme.to_string());
	}

	None
}

fn parse_forwarded(headers: &HeaderMap) -> Option<&str> {
	// if there are multiple `Forwarded` `HeaderMap::get` will return the first one
	let forwarded_values = headers.get(FORWARDED)?.to_str().ok()?;

	let first_value = forwarded_values.split(',').next()?;

	// find the value of the `proto` field
	first_value.split(';').find_map(|pair| {
		let (key, value) = pair.split_once('=')?;
		key.trim()
			.eq_ignore_ascii_case("proto")
			.then(|| value.trim().trim_matches('"'))
	})
}

/// Extracts the client IP from headers in the following priority order:
///
/// 1. X-Real-IP - Non-standard (at least not on mozilla) but common I think
/// 2. X-Forwarded-For - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Forwarded-For
///
/// If neither header is present, falls back to direct connection info
#[derive(Debug, Clone)]
pub struct ClientIp(pub IpAddr);

impl<S> FromRequestParts<S> for ClientIp
where
	AppState: FromRef<S>,
	S: Send + Sync,
{
	type Rejection = std::convert::Infallible;

	async fn from_request_parts(
		parts: &mut Parts,
		state: &S,
	) -> Result<Self, Self::Rejection> {
		let app_state = AppState::from_ref(state);
		let trust_proxy_headers = app_state.config.trust_proxy_headers;

		let ip = extract_client_ip(&parts.headers, &parts.extensions, trust_proxy_headers)
			.unwrap_or_else(|| {
				tracing::warn!("No client IP found in headers or connection info, defaulting to localhost");
				"127.0.0.1".parse().unwrap()
			});
		Ok(ClientIp(ip))
	}
}

fn extract_client_ip(
	headers: &HeaderMap,
	extensions: &Extensions,
	trust_proxy_headers: bool,
) -> Option<IpAddr> {
	if trust_proxy_headers {
		if let Some(ip) = headers
			.get(X_REAL_IP)
			.and_then(|h| h.to_str().ok())
			.and_then(|s| s.trim().parse::<IpAddr>().ok())
		{
			tracing::trace!(?ip, "Found client IP in X-Real-IP header");
			return Some(ip);
		}

		if let Some(ip) = headers
			.get(X_FORWARDED_FOR)
			.and_then(|h| h.to_str().ok())
			.and_then(|s| {
				s.split(',')
					.next()
					.map(|s| s.trim())
					.and_then(|s| s.parse::<IpAddr>().ok())
			}) {
			tracing::trace!(?ip, "Found client IP in X-Forwarded-For header");
			return Some(ip);
		}
	} else if headers.contains_key(X_REAL_IP) || headers.contains_key(X_FORWARDED_FOR) {
		tracing::warn!(
			x_real_header = ?headers.get(X_REAL_IP),
			x_forwarded_for_header = ?headers.get(X_FORWARDED_FOR),
			"Proxy headers present but trust_proxy_headers is false, ignoring client IP from headers"
		);
	}

	if let Some(info) = extensions.get::<StumpRequestInfo>() {
		tracing::trace!(
			ip = ?info.ip_addr,
			"Using direct connection IP"
		);
		return Some(info.ip_addr);
	}

	None
}

#[cfg(test)]
mod tests {
	use super::*;
	use axum::http::HeaderValue;

	#[test]
	fn test_extract_client_ip_from_x_real_ip() {
		let mut headers = HeaderMap::new();
		headers.insert(X_REAL_IP, HeaderValue::from_static("203.0.113.42"));

		let extensions = Extensions::new();
		let ip = extract_client_ip(&headers, &extensions, true);

		assert_eq!(ip, Some("203.0.113.42".parse().unwrap()));
	}

	#[test]
	fn test_extract_client_ip_from_x_forwarded_for() {
		let mut headers = HeaderMap::new();
		headers.insert(
			X_FORWARDED_FOR,
			HeaderValue::from_static("203.0.113.42, 198.51.100.1, 192.0.2.1"),
		);

		let extensions = Extensions::new();
		let ip = extract_client_ip(&headers, &extensions, true);

		assert_eq!(ip, Some("203.0.113.42".parse().unwrap())); // should be the first one
	}

	#[test]
	fn test_extract_client_ip_priority_x_real_ip_over_x_forwarded_for() {
		let mut headers = HeaderMap::new();
		headers.insert(X_REAL_IP, HeaderValue::from_static("203.0.113.42"));
		headers.insert(X_FORWARDED_FOR, HeaderValue::from_static("198.51.100.1"));

		let extensions = Extensions::new();
		let ip = extract_client_ip(&headers, &extensions, true);

		assert_eq!(ip, Some("203.0.113.42".parse().unwrap())); // real
	}

	#[test]
	fn test_extract_client_ip_fallback_to_connection_info() {
		let headers = HeaderMap::new();
		let mut extensions = Extensions::new();
		extensions.insert(StumpRequestInfo {
			ip_addr: "192.0.2.1".parse().unwrap(),
		});

		let ip = extract_client_ip(&headers, &extensions, true);

		assert_eq!(ip, Some("192.0.2.1".parse().unwrap()));
	}

	#[test]
	fn test_extract_client_ip_no_headers_no_extensions() {
		let headers = HeaderMap::new();
		let extensions = Extensions::new();

		let ip = extract_client_ip(&headers, &extensions, true);

		assert_eq!(ip, None);
	}

	#[test]
	fn test_no_extract_proxy_headers_when_trust_proxy_headers_false() {
		let mut headers = HeaderMap::new();
		headers.insert(X_REAL_IP, HeaderValue::from_static("203.0.113.42"));
		headers.insert(X_FORWARDED_FOR, HeaderValue::from_static("198.51.100.1"));

		let mut extensions = Extensions::new();
		extensions.insert(StumpRequestInfo {
			ip_addr: "192.0.2.1".parse().unwrap(),
		});
		let ip = extract_client_ip(&headers, &extensions, false);

		assert_eq!(ip, Some("192.0.2.1".parse().unwrap())); // connect info used, not headers
	}
}
