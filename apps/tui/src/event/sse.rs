use std::sync::Arc;

use futures_util::stream::StreamExt;
use reqwest_eventsource::{Event, EventSource};
use tokio::sync::mpsc::UnboundedSender;

use super::TuiEvent;

// TODO: remove this
#[allow(unused)]
pub struct SSEHandler {
	base_url: String,
	internal_sender: UnboundedSender<TuiEvent>,
}

// FIXME: server is now websockets
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
				EventSource::get(format!("{}/api/jobs/listen", this_cpy.base_url));
			while let Some(event) = source.next().await {
				match event {
					Ok(Event::Open) => {
						// println!("SSE connection opened");
					},
					Ok(Event::Message(message_event)) => {
						this_cpy.handle_message(message_event.data);
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

	fn handle_message(&self, data: String) {
		println!("SSE message: {}", data);
		// deserialize as JobUpdate, will be {key: String, data: ... }, can match
		// on that enum accordingly...
		// requires some heavy restructure again to access core types lol
		// core -> just the core library
		// apps/server -> rocket will need to be moved here
	}
}
