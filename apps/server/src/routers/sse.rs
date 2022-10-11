use std::convert::Infallible;

use axum::{
	response::sse::{Event, Sse},
	routing::get,
	Extension, Router,
};
use futures_util::{stream::Stream, StreamExt};

use crate::{config::state::State, utils::shutdown_signal};

// TODO: do I need auth middleware here? I think so.
pub(crate) fn mount() -> Router {
	Router::new().route("/sse", get(sse_handler))
	// .layer(from_extractor::<Auth>())
}

async fn sse_handler(
	Extension(ctx): State,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
	let mut rx = ctx.get_client_receiver();

	let stream = async_stream::stream! {
		loop {
			if let Ok(msg) = rx.recv().await {
				yield Ok(Event::default().json_data(&msg).unwrap());
			} else {
				continue;
			}
		}
	};

	let guarded_stream = or_until_shutdown(stream);

	Sse::new(guarded_stream)
}

// Solution: https://github.com/hyperium/hyper/issues/2787
/// Run a stream until it completes or we receive the shutdown signal.
fn or_until_shutdown<S>(stream: S) -> impl Stream<Item = S::Item>
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
