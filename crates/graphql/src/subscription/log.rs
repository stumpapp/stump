use crate::data::CoreContext;
use crate::guard::PermissionGuard;
use async_graphql::{Context, Result, Subscription};
use linemux::MuxedLines;
use models::shared::enums::UserPermission;

#[derive(Default)]
pub struct LogSubscription;

#[Subscription]
impl LogSubscription {
	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageLibrary)")]
	async fn tail_log_file(
		&self,
		ctx: &Context<'_>,
	) -> impl futures_util::Stream<Item = Result<String>> {
		let mut log_file_path = None;
		if let Ok(ctx) = ctx.data::<CoreContext>() {
			let config = ctx.config.as_ref();
			log_file_path = Some(config.get_log_file());
		}

		async_stream::stream! {
			let Some(log_file_path) = log_file_path else {
				tracing::error!("Log file path is not set in the context!");
				return;
			};

			let mut lines = MuxedLines::new()?;
			lines.add_file(log_file_path.as_path()).await?;

			while let Ok(Some(line)) = lines.next_line().await {
				yield Ok(line.line().to_string());
			}
		}
	}
}
