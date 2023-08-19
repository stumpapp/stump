mod discord_client;
mod error;
mod telegram_client;

pub use discord_client::DiscordClient;
pub use telegram_client::TelegramClient;

use self::error::NotifierResult;

#[async_trait::async_trait]
pub trait Notifier {
	// TODO: MessageConfig struct? So we can style according to NotifierEvent?
	async fn send_message(&self, message: &str) -> NotifierResult<()>;
}
