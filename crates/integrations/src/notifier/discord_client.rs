use serde_json::json;

use super::{error::NotifierResult, Notifier, NotifierEvent, FAVICON_URL, NOTIFIER_ID};

pub struct DiscordClient {
	pub webhook_url: String,
	pub client: reqwest::Client,
}

impl DiscordClient {
	pub fn new(webhook_url: String) -> Self {
		let client = reqwest::Client::new();
		Self {
			webhook_url,
			client,
		}
	}
}

//https://core.telegram.org/bots/api#message

#[async_trait::async_trait]
impl Notifier for DiscordClient {
	fn payload_from_event(event: NotifierEvent) -> NotifierResult<serde_json::Value> {
		let payload = match event {
			NotifierEvent::ScanCompleted {
				books_added,
				library_name,
			} => json!({
				"username" : NOTIFIER_ID,
				"avatar_url" : FAVICON_URL,
				"embeds" : [{
					"title" : "Scan Completed!",
					"description": format!("{books_added} books added to {library_name}"),
					"color" : 13605239,
				}]
			}),
		};
		Ok(payload)
	}

	async fn send_message(&self, event: NotifierEvent) -> NotifierResult<()> {
		let body = Self::payload_from_event(event)?;
		let response = self
			.client
			.post(&self.webhook_url)
			.json(&body)
			.send()
			.await?;
		println!("{:?}", response);
		Ok(())
	}
}

// https://birdie0.github.io/discord-webhooks-guide/structure/embed/color.html

#[cfg(test)]
mod tests {
	use super::*;
	use dotenv::dotenv;

	fn get_debug_client() -> DiscordClient {
		dotenv().ok();
		let webhook_url = std::env::var("DUMMY_DISCORD_WEBHOOK_URL")
			.expect("Failed to load webhook URL");
		DiscordClient::new(webhook_url)
	}

	#[tokio::test]
	async fn test_send_message() {
		let client = get_debug_client();
		let event = NotifierEvent::ScanCompleted {
			books_added: 69,
			library_name: String::from("deez"),
		};
		let response = client.send_message(event).await;
		assert!(response.is_ok());
	}

	#[test]
	fn test_scan_completed() {
		let event = NotifierEvent::ScanCompleted {
			books_added: 5,
			library_name: String::from("test"),
		};
		let response = DiscordClient::payload_from_event(event).unwrap();
		assert!(response.is_object());
		let embeds = response["embeds"].to_owned();
		assert!(embeds.is_array());
		assert_eq!(
			embeds[0]["description"],
			String::from("5 books added to test")
		);
	}
}
