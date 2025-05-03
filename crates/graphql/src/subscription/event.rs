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
			if client_recv.is_none() {
				return;
			}

			let mut client_recv = client_recv.unwrap();
			while let Ok(event) = client_recv.recv().await {
				yield Ok(event);
			}
		}
	}
}
