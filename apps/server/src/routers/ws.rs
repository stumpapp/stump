use std::sync::Arc;

use axum::{
	extract::{
		ws::{Message, WebSocket, WebSocketUpgrade},
		State,
	},
	response::IntoResponse,
	routing::get,
	Router,
};
use futures_util::{sink::SinkExt, stream::StreamExt};
use stump_core::Ctx;

use crate::config::state::AppState;

// TODO: do I need auth middleware here? I think so, but I think the ws:// is
// throwing if off and making it not think there is a session when there is.
pub(crate) fn mount() -> Router<AppState> {
	Router::new().route("/ws", get(ws_handler))
	// .layer(from_extractor_with_state::<Auth, AppState>(app_state))
}

async fn ws_handler(
	ws: WebSocketUpgrade,
	State(ctx): State<AppState>,
) -> impl IntoResponse {
	ws.on_upgrade(|socket| handle_socket(socket, ctx))
}

async fn handle_socket(socket: WebSocket, ctx: Arc<Ctx>) {
	let (mut sender, mut _receiver) = socket.split();

	let mut rx = ctx.get_client_receiver();

	while let Ok(core_event) = rx.recv().await {
		if let Ok(payload) = serde_json::to_string(&core_event) {
			// TODO: Pipe errors give me a twitchy eye
			let _ = sender.send(Message::Text(payload)).await;
		}
	}
}
