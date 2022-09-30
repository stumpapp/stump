use std::net;
use stump_core::types::CoreError;
use thiserror::Error;

pub type ServerResult<T> = Result<T, ServerError>;

#[derive(Debug, Error)]
pub enum ServerError {
	// TODO: meh
	#[error("{0}")]
	ServerStartError(String),
	#[error("Stump failed to parse the provided address: {0}")]
	InvalidAddress(#[from] net::AddrParseError),
}
