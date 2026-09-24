use crate::data::{AuthContext, CoreContext};
use async_graphql::{Context, Result, Subscription};
use models::shared::enums::UserPermission;
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
		if let Ok(auth) = ctx.data::<AuthContext>() {
			if auth.user.has_permission(UserPermission::ReadEvents) {
				if let Ok(core_ctx) = ctx.data::<CoreContext>() {
					client_recv = Some(core_ctx.get_client_receiver());
				}
			}
		}

		async_stream::stream! {
			let Some(mut rx) = client_recv else {
				return; // no permisions = empty stream
			};

			while let Ok(event) = rx.recv().await {
				yield Ok(event);
			}
		}
	}
}
