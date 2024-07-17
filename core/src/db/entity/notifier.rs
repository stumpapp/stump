use crate::{prisma::notifier, utils::encrypt_string, CoreError, CoreResult, Ctx};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::str::FromStr;
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, ToSchema, Type)]
pub struct Notifier {
	/// The ID of the notifier
	id: i32,
	// Note: This isn't really needed, we could rely on tags. However, in order to have at least one
	// readable field in the DB (since the config is dumped to bytes) I left this in
	#[serde(rename = "type")]
	_type: NotifierType,
	/// The config is stored as bytes in the DB, and is deserialized into the correct type when
	/// needed. If there are sensitive fields, they should be encrypted before being stored.
	config: NotifierConfig,
}

/// The config for a Discord notifier
#[derive(Serialize, Deserialize, ToSchema, Type)]
pub struct DiscordConfig {
	/// The webhook URL to send to
	pub webhook_url: String,
}

/// The config for a Telegram notifier
#[derive(Serialize, Deserialize, ToSchema, Type)]
pub struct TelegramConfig {
	/// The encrypted token to use for the Telegram bot. This is encrypted before being stored,
	/// and decrypted when needed.
	pub encrypted_token: String,
	/// The chat ID to send to
	pub chat_id: String,
}

#[derive(Serialize, Deserialize, ToSchema, Type)]
#[serde(untagged)]
pub enum NotifierConfig {
	Discord(DiscordConfig),
	Telegram(TelegramConfig),
}

impl NotifierConfig {
	pub fn into_bytes(self) -> Result<Vec<u8>, CoreError> {
		Ok(serde_json::to_vec(&self)?)
	}
}

#[derive(Serialize, Deserialize, ToSchema, Type)]
pub struct TelegramConfigInput {
	pub token: String,
	pub chat_id: String,
}

#[derive(Serialize, Deserialize, ToSchema, Type)]
#[serde(untagged)]
pub enum NotifierConfigInput {
	Discord(DiscordConfig),
	Telegram(TelegramConfigInput),
}

impl NotifierConfigInput {
	pub async fn into_config(self, ctx: &Ctx) -> CoreResult<NotifierConfig> {
		match self {
			NotifierConfigInput::Discord(config) => Ok(NotifierConfig::Discord(config)),
			NotifierConfigInput::Telegram(config) => {
				let encryption_key = ctx.get_encryption_key().await?;
				let encrypted_token = encrypt_string(&config.token, &encryption_key)?;
				Ok(NotifierConfig::Telegram(TelegramConfig {
					encrypted_token,
					chat_id: config.chat_id,
				}))
			},
		}
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
