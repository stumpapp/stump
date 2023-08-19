use serde_json::json;

use super::{error::NotifierResult, Notifier};

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

#[async_trait::async_trait]
impl Notifier for DiscordClient {
	async fn send_message(&self, message: &str) -> NotifierResult<()> {
		let body = json!({
			"content" : message
		});
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

#[cfg(test)]
mod tests {
	use super::*;

	#[tokio::test]
	async fn test_send_message() {
		let client = DiscordClient::new(String::from("https://discord.com/api/webhooks/1142566951663698012/8CFg89RjkeAyo7w8_6qJUNzN9Hu_MG5TVa6PYZi_PqTN2OYn3pU-1ii5NlSSLn-dfbHX"));
		let response = client.send_message("hello").await;
		assert!(response.is_ok());
	}
}
