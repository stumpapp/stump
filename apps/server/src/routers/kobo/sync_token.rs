//! The sync token tracks both Stump and Kobo Store pagination. It is opaque to the
//! device and returned in the `x-kobo-synctoken` header.

use std::str::Utf8Error;

use axum::http::HeaderValue;
use base64::{engine::general_purpose::STANDARD_NO_PAD as BASE64, Engine};
use reqwest::header::{InvalidHeaderValue, ToStrError};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SyncToken {
	/// Stump's local pagination state. This is flattened to keep legacy tokens valid.
	#[serde(flatten)]
	pub state: Option<SyncState>,

	/// The opaque token returned by the Kobo Store. It is never sent upstream wrapped.
	#[serde(default, skip_serializing_if = "Option::is_none")]
	pub kobo_store_token: Option<String>,

	/// Version of the local content representation last sent to this device.
	#[serde(default, skip_serializing_if = "is_zero")]
	pub content_version: u8,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SyncState {
	/// More local Stump pages remain in this sync session.
	IncompleteV1 {
		/// ID of the database KoboSyncSession.
		sync_id: String,

		/// Offset of the next local page.
		next_offset: usize,
	},

	/// The local and upstream pages for this sync session are complete.
	CompletedV1 {
		/// ID of the database KoboSyncSession.
		sync_id: String,
	},

	/// Local pagination is complete and Kobo Store pages remain.
	UpstreamV1 {
		/// ID of the database KoboSyncSession.
		sync_id: String,
	},
}

#[derive(Error, Debug)]
pub enum SyncTokenSerializeError {
	#[error("Could not serialize JSON: {0}")]
	JSONError(#[from] serde_json::Error),
	#[error("Could not encode this token as a header: {0}")]
	InvalidHeaderError(#[from] InvalidHeaderValue),
}

#[allow(clippy::enum_variant_names)]
#[derive(Error, Debug)]
pub enum SyncTokenDeserializeError {
	#[error("Could not deserialize string from header: {0}")]
	HeaderToStrError(#[from] ToStrError),
	#[error("Could not decode UTF-8: {0}")]
	UTF8Error(#[from] Utf8Error),
	#[error("Could not decode Base64: {0}")]
	Base64Error(#[from] base64::DecodeError),
	#[error("Could not deserialize JSON: {0}")]
	JSONError(#[from] serde_json::Error),
	#[error("Token JSON is not a Stump sync token")]
	NotStumpToken,
}

fn is_zero(version: &u8) -> bool {
	*version == 0
}

impl SyncState {
	pub fn new(sync_id: String, completed: bool, next_offset: usize) -> Self {
		if completed {
			Self::CompletedV1 { sync_id }
		} else {
			Self::IncompleteV1 {
				sync_id,
				next_offset,
			}
		}
	}

	pub fn sync_id(&self) -> &str {
		match self {
			Self::IncompleteV1 { sync_id, .. }
			| Self::CompletedV1 { sync_id }
			| Self::UpstreamV1 { sync_id } => sync_id,
		}
	}
}

impl SyncToken {
	pub fn new(
		state: Option<SyncState>,
		kobo_store_token: Option<String>,
		content_version: u8,
	) -> Self {
		Self {
			state,
			kobo_store_token,
			content_version,
		}
	}

	/// Returns the content representation version to send back to the device.
	/// Recording a downgrade ensures a later upgrade forces a full sync.
	pub fn effective_content_version(&self, server_version: u8) -> u8 {
		server_version
	}

	/// Any representation-version change requires one full local sync so unchanged
	/// books receive their current format and revision IDs.
	pub fn requires_full_sync(&self, server_version: u8) -> bool {
		self.content_version != server_version
	}

	fn try_from_base64_str(s: &str) -> Result<Self, SyncTokenDeserializeError> {
		let json_bytes = BASE64.decode(s)?;
		let json = std::str::from_utf8(&json_bytes)?;
		let value: serde_json::Value = serde_json::from_str(json)?;
		let is_stump_token = value
			.get("type")
			.and_then(serde_json::Value::as_str)
			.is_some_and(|token_type| {
				matches!(token_type, "IncompleteV1" | "CompletedV1" | "UpstreamV1")
			});
		if !is_stump_token {
			return Err(SyncTokenDeserializeError::NotStumpToken);
		}

		serde_json::from_value(value).map_err(Into::into)
	}

	pub fn try_from_header_value(
		hv: &HeaderValue,
	) -> Result<Self, SyncTokenDeserializeError> {
		let value = hv.to_str()?;

		// A device pointed at Stump may still hold an official, non-Stump token. Preserve
		// it as opaque store state and begin a fresh local sync.
		Ok(Self::try_from_base64_str(value).unwrap_or_else(|_| Self {
			state: None,
			kobo_store_token: (!value.is_empty()).then(|| value.to_string()),
			content_version: 0,
		}))
	}

	fn try_to_base64_string(&self) -> Result<String, SyncTokenSerializeError> {
		let json = serde_json::to_string(self)?;
		Ok(BASE64.encode(json))
	}

	pub fn try_to_header_value(&self) -> Result<HeaderValue, SyncTokenSerializeError> {
		let value = self.try_to_base64_string()?;
		HeaderValue::from_str(value.as_ref()).map_err(Into::into)
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn parses_legacy_local_token() {
		let legacy = BASE64
			.encode(r#"{"type":"IncompleteV1","sync_id":"sync-1","next_offset":12}"#);
		let token = SyncToken::try_from_header_value(
			&HeaderValue::from_str(&legacy).expect("valid header"),
		)
		.expect("legacy token should parse");

		assert_eq!(
			token,
			SyncToken::new(
				Some(SyncState::IncompleteV1 {
					sync_id: "sync-1".to_string(),
					next_offset: 12,
				}),
				None,
				0,
			)
		);
	}

	#[test]
	fn preserves_official_token_as_opaque_state() {
		let token = SyncToken::try_from_header_value(&HeaderValue::from_static(
			"official.header-token",
		))
		.expect("official token should be accepted");

		assert_eq!(token.state, None);
		assert_eq!(
			token.kobo_store_token.as_deref(),
			Some("official.header-token")
		);
		assert_eq!(token.content_version, 0);
	}

	#[test]
	fn preserves_base64_json_store_token_as_opaque_state() {
		let store_token = BASE64.encode(r#"{"cursor":"official-store-page"}"#);
		let token = SyncToken::try_from_header_value(
			&HeaderValue::from_str(&store_token).expect("valid header"),
		)
		.expect("official token should be accepted");

		assert_eq!(token.state, None);
		assert_eq!(
			token.kobo_store_token.as_deref(),
			Some(store_token.as_str())
		);
	}

	#[test]
	fn round_trips_combined_token() {
		let token = SyncToken::new(
			Some(SyncState::UpstreamV1 {
				sync_id: "sync-1".to_string(),
			}),
			Some("store-token".to_string()),
			2,
		);
		let header = token.try_to_header_value().expect("token should serialize");

		assert_eq!(
			SyncToken::try_from_header_value(&header).expect("token should parse"),
			token
		);
	}

	#[test]
	fn content_version_tracks_server_representation() {
		let token = SyncToken::new(None, None, 2);

		assert!(token.requires_full_sync(1));
		assert_eq!(token.effective_content_version(1), 1);
		assert!(!token.requires_full_sync(2));
		assert!(token.requires_full_sync(3));
		assert_eq!(token.effective_content_version(3), 3);
	}

	#[test]
	fn sync_state_exposes_session_id() {
		let state = SyncState::new("sync-1".to_string(), false, 5);

		assert_eq!(state.sync_id(), "sync-1");
		assert_eq!(
			state,
			SyncState::IncompleteV1 {
				sync_id: "sync-1".to_string(),
				next_offset: 5,
			}
		);
	}
}
