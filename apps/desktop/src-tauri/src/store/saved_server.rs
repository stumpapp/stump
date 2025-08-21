use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::Url;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedServer {
	pub id: String,
	pub name: String,
	pub uri: Url,
	#[serde(default, alias = "isDefault")]
	pub is_default: bool,
}

impl SavedServer {
	pub fn from_vec(value: Vec<Value>) -> Vec<SavedServer> {
		let (valid, invalid): (Vec<_>, Vec<_>) = value
			.into_iter()
			.map(SavedServer::try_from)
			.partition(Result::is_ok);

		if !invalid.is_empty() {
			tracing::error!(?invalid, "Failed to parse some saved servers");
		}

		valid.into_iter().map(Result::unwrap).collect()
	}
}

impl TryFrom<&Value> for SavedServer {
	type Error = serde_json::Error;

	fn try_from(value: &Value) -> Result<Self, Self::Error> {
		serde_json::from_value(value.clone())
	}
}

impl TryFrom<Value> for SavedServer {
	type Error = serde_json::Error;

	fn try_from(value: Value) -> Result<Self, Self::Error> {
		serde_json::from_value(value)
	}
}
