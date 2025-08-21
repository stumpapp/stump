use crate::data::CoreContext;
use async_graphql::{Context, Result, Subscription};
use stump_core::CoreEvent;

#[derive(Default)]
pub struct EventSubscription;

#[Subscription]
impl EventSubscription {
	async fn read_events(
		&self,
		ctx: &Context<'_>,
	) -> impl futures_util::Stream<Item = Result<CoreEvent>> {
		let mut client_recv = None;
		if let Ok(ctx) = ctx.data::<CoreContext>() {
			client_recv = Some(ctx.get_client_receiver());
		}

		async_stream::stream! {
			let Some(mut rx) = client_recv else {
				tracing::error!("Failed to get client receiver from context!");
				return;
			};

			while let Ok(event) = rx.recv().await {
				yield Ok(event);
			}
		}
	}
}
