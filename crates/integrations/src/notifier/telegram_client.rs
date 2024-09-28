use crate::Notifier;

use super::{
	error::{NotifierError, NotifierResult},
	NotifierEvent,
};

pub struct TelegramClient {
	token: String,
	chat_id: String,
	client: reqwest::Client,
}

impl TelegramClient {
	pub fn new(token: String, chat_id: String) -> Self {
		let client = reqwest::Client::new();
		Self {
			token,
			chat_id,
			client,
		}
	}
}

#[async_trait::async_trait]
impl Notifier for TelegramClient {
	fn payload_from_event(_event: NotifierEvent) -> NotifierResult<serde_json::Value> {
		Err(NotifierError::Unimplemented(
			"Telegram does not support request bodies".to_string(),
		))
	}
	async fn send_message(&self, event: NotifierEvent) -> NotifierResult<()> {
		let token = self.token.clone();
		let chat_id = self.chat_id.clone();
		let message = event.into_message();
		let response = self
		.client
		.post(format!("https://api.telegram.org/bot{token}/sendMessage?chat_id={chat_id}&text={message}"))
		.send()
		.await?;
		if !response.status().is_success() {
			let errmsg = response
				.text()
				.await
				.unwrap_or_else(|_| "sendMessage failed".to_string());
			Err(NotifierError::RequestFailed(errmsg))
		} else {
			Ok(())
		}
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use dotenv::dotenv;

	fn get_debug_client() -> TelegramClient {
		dotenv().ok();
		let token = std::env::var("DUMMY_TG_TOKEN").expect("Failed to load token");
		let chat_id = std::env::var("DUMMY_TG_CHAT_ID").expect("Failed to load chat ID");
		TelegramClient::new(token, chat_id)
	}

	#[ignore = "No token"]
	#[tokio::test]
	async fn test_send_message() {
		let client = get_debug_client();
		let event = NotifierEvent::ScanCompleted {
			books_added: 50,
			library_name: String::from("test_library"),
		};
		let response = client.send_message(event).await;
		assert!(response.is_ok());
	}

	#[tokio::test]
	async fn test_send_message_failed() {
		let client = TelegramClient::new("bad".to_string(), "bad".to_string());
		let event = NotifierEvent::ScanCompleted {
			books_added: 50,
			library_name: String::from("test_library"),
		};
		let response = client.send_message(event).await;
		assert!(response.is_err());
		let result = response.unwrap_err();
		println!("{:?}", result);
	}
}
