use std::convert::Infallible;

use axum::{
	extract::State,
	response::sse::{Event, Sse},
	routing::get,
	Router,
};
use futures_util::{stream::Stream, StreamExt};

use crate::{config::state::AppState, utils::shutdown_signal};

// TODO: do I need auth middleware here? I think so.
pub(crate) fn mount() -> Router<AppState> {
	Router::new().route("/sse", get(sse_handler))
	// .layer(from_extractor_with_state::<Auth, AppState>(app_state))
}

async fn sse_handler(
	State(ctx): State<AppState>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
	let mut rx = ctx.get_client_receiver();

	let stream = async_stream::stream! {
		loop {
			if let Ok(msg) = rx.recv().await {
				match Event::default().json_data(&msg) {
					Ok(event) => yield Ok(event),
					Err(err) => {
						tracing::error!("Failed to create SSE event: {}", err);
						continue;
					}
				}
			} else {
				continue;
			}
		}
	};

	let guarded_stream = stream_shutdown_guard(stream);

	Sse::new(guarded_stream)
}

// Solution: https://github.com/hyperium/hyper/issues/2787
/// Run a stream until it completes or we receive the shutdown signal.
pub(crate) fn stream_shutdown_guard<S>(stream: S) -> impl Stream<Item = S::Item>
where
	S: Stream,
{
	async_stream::stream! {
		futures_util::pin_mut!(stream);

		let shutdown_signal = shutdown_signal();
		futures_util::pin_mut!(shutdown_signal);

		loop {
			tokio::select! {
				Some(item) = stream.next() => {
					yield item
				}
				_ = &mut shutdown_signal => {
					break;
				}
			}
		}
	}
}
