use serde::{Deserialize, Deserializer};

/// Some providers don't seem to use consistent IDs across the API which is a bit annoying.
/// This handles strings/numbers and returns a string for consistency
pub fn string_or_number<'de, D>(deserializer: D) -> Result<String, D::Error>
where
	D: Deserializer<'de>,
{
	let value = serde_json::Value::deserialize(deserializer)?;
	match value {
		serde_json::Value::String(s) => Ok(s),
		serde_json::Value::Number(n) => Ok(n.to_string()),
		_ => Err(serde::de::Error::custom("expected string or number")),
	}
}
