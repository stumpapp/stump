mod discord_client;
mod error;
mod event;
mod telegram_client;

pub use discord_client::DiscordClient;
pub use event::NotifierEvent;
pub use telegram_client::TelegramClient;

use self::error::NotifierResult;

pub const NOTIFIER_ID: &str = "Stump Notifier";
pub const FAVICON_URL: &str = "https://stumpapp.dev/favicon.png";

#[async_trait::async_trait]
pub trait Notifier {
	// TODO: MessageConfig struct? So we can style according to NotifierEvent?
	fn payload_from_event(event: NotifierEvent) -> serde_json::Value;
	async fn send_message(&self, event: NotifierEvent) -> NotifierResult<()>;
}
