use crate::{prisma::notifier, CoreError};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::str::FromStr;
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, ToSchema, Type)]
pub struct Notifier {
	id: i32,
	// Note: This isn't really needed, we could rely on tags. However, in order to have at least one
	// readable field in the DB (since the config is dumped to bytes) I left this in
	#[serde(rename = "type")]
	_type: NotifierType,
	config: NotifierConfig,
}

#[derive(Serialize, Deserialize, ToSchema, Type)]
#[serde(untagged)]
pub enum NotifierConfig {
	Discord {
		webhook_url: String,
	},
	Telegram {
		encrypted_token: String,
		chat_id: String,
	},
}

impl NotifierConfig {
	pub fn into_bytes(self) -> Result<Vec<u8>, CoreError> {
		Ok(serde_json::to_vec(&self)?)
	}
}

#[derive(Serialize, Deserialize, ToSchema, Type)]
pub enum NotifierType {
	#[serde(rename = "DISCORD")]
	Discord,
	#[serde(rename = "TELEGRAM")]
	Telegram,
}

impl ToString for NotifierType {
	fn to_string(&self) -> String {
		match self {
			NotifierType::Discord => String::from("DISCORD"),
			NotifierType::Telegram => String::from("TELEGRAM"),
		}
	}
}

impl FromStr for NotifierType {
	type Err = String;

	fn from_str(s: &str) -> Result<Self, Self::Err> {
		let uppercase = s.to_uppercase();

		match uppercase.as_str() {
			"DISCORD" => Ok(NotifierType::Discord),
			"TELEGRAM" => Ok(NotifierType::Telegram),
			_ => Err(format!("Invalid NotifierType: {}", s)),
		}
	}
}

impl TryFrom<notifier::Data> for Notifier {
	type Error = CoreError;

	fn try_from(value: notifier::Data) -> Result<Self, Self::Error> {
		Ok(Notifier {
			_type: NotifierType::from_str(&value.r#type)
				.map_err(|e| CoreError::InternalError(e.to_string()))?,
			config: serde_json::from_slice(&value.config)?,
			id: value.id,
		})
	}
}
