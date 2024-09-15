#![allow(clippy::enum_variant_names)]

use crate::{
	commands::DeskopRPCError, store::StoreError, utils::discord::DiscordIntegrationError,
};

#[derive(Debug, thiserror::Error)]
pub enum DesktopError {
	#[error("{0}")]
	RPCError(#[from] DeskopRPCError),
	#[error("{0}")]
	DiscordError(#[from] DiscordIntegrationError),
	#[error("{0}")]
	StoreError(#[from] StoreError),
}
