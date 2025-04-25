use async_graphql::{InputObject, OneofObject, Result};
use models::entity::notifier::{self, NotifierConfig, NotifierType};
use sea_orm::{ActiveValue::NotSet, Set};
use simple_crypt::encrypt;

#[derive(InputObject)]
pub struct DiscordConfigInput {
	pub webhook_url: String,
}

#[derive(InputObject)]
pub struct TelegramConfigInput {
	pub token: String,
	pub chat_id: String,
}

#[derive(OneofObject)]
pub enum NotifierInput {
	Discord(DiscordConfigInput),
	Telegram(TelegramConfigInput),
}

impl NotifierInput {
	pub fn try_into_active_model(self, key: &String) -> Result<notifier::ActiveModel> {
		let (notifier_type, notifier_config) = match self {
			NotifierInput::Discord(config) => (
				NotifierType::Discord,
				NotifierConfig::Discord(notifier::DiscordConfig {
					webhook_url: config.webhook_url,
				}),
			),
			NotifierInput::Telegram(config) => (
				NotifierType::Telegram,
				NotifierConfig::Telegram(notifier::TelegramConfig {
					encrypted_token: encrypt_string(key, &config.token)?,
					chat_id: config.chat_id,
				}),
			),
		};

		Ok(notifier::ActiveModel {
			id: NotSet, // auto-incremented
			r#type: Set(notifier_type.to_string()),
			config: Set(notifier_config.into_bytes()?),
		})
	}
}

// TODO(graphql): move this to a common place?
fn encrypt_string(str: &str, encryption_key: &String) -> Result<String> {
	let encrypted_bytes =
		encrypt(str.as_bytes(), encryption_key.as_bytes()).map_err(|e| e.to_string())?;
	Ok(data_encoding::BASE64.encode(&encrypted_bytes))
}
