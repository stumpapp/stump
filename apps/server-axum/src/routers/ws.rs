use std::sync::Arc;

use axum::{
	extract::ws::{Message, WebSocket, WebSocketUpgrade},
	response::IntoResponse,
	routing::get,
	Extension, Router,
};
// use axum_typed_websockets::{Message, WebSocket, WebSocketUpgrade};
use futures_util::{sink::SinkExt, stream::StreamExt};
use stump_core::config::Ctx;
use tracing::error;

use crate::config::state::State;

// TODO: do I need auth middleware here? I think so, but I think the ws:// is
// throwing if off and making it not think there is a session when there is.
pub(crate) fn mount() -> Router {
	Router::new().route("/ws", get(ws_handler))
	// .layer(from_extractor::<Auth>())
}

async fn ws_handler(ws: WebSocketUpgrade, Extension(ctx): State) -> impl IntoResponse {
	ws.on_upgrade(|socket| handle_socket(socket, ctx))
}

async fn handle_socket(socket: WebSocket, ctx: Arc<Ctx>) {
	let (mut sender, mut _receiver) = socket.split();

	let mut rx = ctx.get_client_receiver();

	// if let Ok(msg) = rx.recv().await {}
	while let Ok(core_event) = rx.recv().await {
		if let Ok(payload) = serde_json::to_string(&core_event) {
			sender
				.send(Message::Text(payload))
				.await
				.unwrap_or_else(|e| error!("Failed to send message: {}", e));
		}
	}
}
