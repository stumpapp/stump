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

/// Optional version of [`string_or_number`]
pub fn option_string_or_number<'de, D>(
	deserializer: D,
) -> Result<Option<String>, D::Error>
where
	D: Deserializer<'de>,
{
	let value: Option<serde_json::Value> = Option::deserialize(deserializer)?;
	match value {
		None => Ok(None),
		Some(serde_json::Value::Null) => Ok(None),
		Some(serde_json::Value::String(s)) => Ok(Some(s)),
		Some(serde_json::Value::Number(n)) => Ok(Some(n.to_string())),
		_ => Err(serde::de::Error::custom("expected string, number, or null")),
	}
}
