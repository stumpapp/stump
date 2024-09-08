use crate::{commands::DeskopRPCError, utils::discord::DiscordIntegrationError};

#[derive(Debug, thiserror::Error)]
pub enum DesktopError {
	#[error("{0}")]
	RPCError(#[from] DeskopRPCError),
	#[error("{0}")]
	DiscordError(#[from] DiscordIntegrationError),
}
