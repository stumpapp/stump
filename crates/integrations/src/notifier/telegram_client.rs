use crate::Notifier;

use super::error::NotifierResult;

pub struct TelegramClient {
	token: String,
	chat_id: String,
}

impl TelegramClient {
	pub fn new(token: String, chat_id: String) -> Self {
		Self { token, chat_id }
	}
}

#[async_trait::async_trait]
impl Notifier for TelegramClient {
	async fn send_message(&self, message: &str) -> NotifierResult<()> {
		unimplemented!("TelegramClient::send_message")
	}
}
