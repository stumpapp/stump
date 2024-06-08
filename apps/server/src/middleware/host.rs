use async_trait::async_trait;
use axum::{
	extract::{FromRef, FromRequestParts, Host},
	http::request::Parts,
};

use crate::{config::state::AppState, errors::APIError};

#[derive(Debug)]
pub struct HostDetails {
	host: String,
	scheme: String,
}

impl HostDetails {
	pub fn url(&self) -> String {
		format!("{}://{}", self.scheme, self.host)
	}
}

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
		let scheme = parts.uri.scheme_str().unwrap_or("http").to_string();
		Ok(HostExtractor(HostDetails {
			host: host.0,
			scheme,
		}))
	}
}
