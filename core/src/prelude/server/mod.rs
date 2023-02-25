use serde::{Deserialize, Serialize};
use specta::Type;

pub mod http;
pub mod inputs;
pub mod pageable;
pub mod query;

pub use http::*;
pub use inputs::*;
pub use pageable::*;
pub use query::*;
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, Type, ToSchema)]
pub struct StumpVersion {
	pub semver: String,
	pub rev: Option<String>,
	pub compile_time: String,
}
