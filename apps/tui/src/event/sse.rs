use std::sync::Arc;

use futures_util::stream::StreamExt;
use reqwest_eventsource::{Event as EventSourceEvent, EventSource};
use tokio::sync::mpsc::UnboundedSender;

use super::TuiEvent;

pub struct SSEHandler {
	base_url: String,
	internal_sender: UnboundedSender<TuiEvent>,
}

impl SSEHandler {
	pub fn new(base_url: &str, internal_sender: UnboundedSender<TuiEvent>) -> Arc<Self> {
		let this = Arc::new(Self {
			base_url: base_url.to_string(),
			internal_sender,
		});

		let this_cpy = this.clone();
		tokio::spawn(async move {
			// https://docs.rs/reqwest-eventsource/latest/reqwest_eventsource/
			// FIXME: this panics if cannot connect. What a bad implementation...
			let mut source =
				EventSource::get(&format!("{}/api/jobs/listen", this_cpy.base_url));
			while let Some(event) = source.next().await {
				match event {
					Ok(EventSourceEvent::Open) => {
						// println!("SSE connection opened");
					},
					Ok(EventSourceEvent::Message(message)) => {
						// println!("SSE message: {:?}", message);
					},
					Err(err) => {
						println!("Error: {}", err);
						source.close();
					},
				}
			}
		});

		this
	}
}
