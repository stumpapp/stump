use crate::prisma::notifier;
use serde::{Deserialize, Serialize};
use specta::Type;
use std::str::FromStr;
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, ToSchema, Type)]
pub struct Notifier {
	id: i32,
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
	pub fn into_bytes(self) -> Vec<u8> {
		// FIXME: don't panic! Add error handling
		serde_json::to_vec(&self).expect("Failed to convert to bytes!")
	}
}

#[derive(Serialize, Deserialize, ToSchema, Type)]
pub enum NotifierType {
	Discord,
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

impl From<notifier::Data> for Notifier {
	fn from(value: notifier::Data) -> Self {
		let config =
			serde_json::from_slice(&value.config).expect("could not serialize config"); //TODO: don't panic here

		Notifier {
			_type: NotifierType::from_str(value.r#type.as_str())
				.expect("could not convert type"), //TODO: don't panic here
			config,
			id: value.id,
		}
	}
}
