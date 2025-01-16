#![allow(clippy::enum_variant_names)]

use crate::{
	commands::DesktopRPCError, store::StoreError, utils::discord::DiscordIntegrationError,
};

#[derive(Debug, thiserror::Error)]
pub enum DesktopError {
	#[error("{0}")]
	RPCError(#[from] DesktopRPCError),
	#[error("{0}")]
	DiscordError(#[from] DiscordIntegrationError),
	#[error("{0}")]
	StoreError(#[from] StoreError),
}
