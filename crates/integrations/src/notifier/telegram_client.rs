use crate::Notifier;

use super::{error::NotifierResult, NotifierEvent};

pub struct TelegramClient {
	pub token: String,
	pub chat_id: String,
}

impl TelegramClient {
	pub fn new(token: String, chat_id: String) -> Self {
		Self { token, chat_id }
	}
}

#[async_trait::async_trait]
impl Notifier for TelegramClient {
	fn payload_from_event(_event: NotifierEvent) -> serde_json::Value {
		unimplemented!()
	}
	async fn send_message(&self, _event: NotifierEvent) -> NotifierResult<()> {
		unimplemented!("TelegramClient::send_message")
	}
}
