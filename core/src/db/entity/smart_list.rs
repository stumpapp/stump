use std::str::FromStr;

use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{
	db::filter::{FilterJoin, MediaSmartFilter, SmartFilter},
	prisma::smart_list,
	CoreError,
};

#[derive(Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
pub struct SmartList {
	pub id: String,
	pub name: String,
	pub description: Option<String>,
	pub filters: SmartFilter<MediaSmartFilter>,
	#[serde(default)]
	pub joiner: FilterJoin,
}

impl TryFrom<smart_list::Data> for SmartList {
	type Error = CoreError;

	fn try_from(value: smart_list::Data) -> Result<Self, Self::Error> {
		Ok(Self {
			id: value.id,
			name: value.name,
			description: value.description,
			filters: serde_json::from_slice(&value.filters).map_err(|e| {
				tracing::error!(?e, "Failed to deserialize smart list filters");
				CoreError::InternalError(e.to_string())
			})?,
			joiner: FilterJoin::from_str(&value.joiner).map_err(|e| {
				tracing::error!(?e, "Failed to deserialize smart list joiner");
				CoreError::InternalError(e.to_string())
			})?,
		})
	}
}
