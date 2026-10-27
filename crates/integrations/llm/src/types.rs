use serde::{Deserialize, Serialize};

/// A single message in an OpenAI-compatible chat request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
	pub role: String,
	pub content: String,
}

impl ChatMessage {
	pub fn system(content: impl Into<String>) -> Self {
		Self {
			role: "system".to_string(),
			content: content.into(),
		}
	}

	pub fn user(content: impl Into<String>) -> Self {
		Self {
			role: "user".to_string(),
			content: content.into(),
		}
	}
}

#[derive(Debug, Serialize)]
pub struct ChatRequest {
	pub model: String,
	pub messages: Vec<ChatMessage>,
	pub temperature: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct ChatResponse {
	pub choices: Vec<ChatChoice>,
	pub usage: Option<ChatUsage>,
}

#[derive(Debug, Deserialize)]
pub struct ChatChoice {
	pub message: ChatMessage,
}

#[derive(Debug, Deserialize)]
#[serde(default)]
pub struct ChatUsage {
	pub prompt_tokens: u64,
	pub completion_tokens: u64,
}

impl Default for ChatUsage {
	fn default() -> Self {
		Self {
			prompt_tokens: 0,
			completion_tokens: 0,
		}
	}
}
