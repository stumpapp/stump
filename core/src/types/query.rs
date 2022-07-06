use rocket_okapi::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::{
	prisma::{media, series},
	types::{errors::ApiError, pageable::PageParams},
};

#[derive(Debug, Serialize, Deserialize, Clone, JsonSchema, FromFormField)]
pub enum Direction {
	#[serde(rename = "asc")]
	Asc,
	#[serde(rename = "desc")]
	Desc,
}

impl Default for Direction {
	fn default() -> Self {
		Direction::Asc
	}
}

impl Into<prisma_client_rust::Direction> for Direction {
	fn into(self) -> prisma_client_rust::Direction {
		match self {
			Direction::Asc => prisma_client_rust::Direction::Asc,
			Direction::Desc => prisma_client_rust::Direction::Desc,
		}
	}
}

/// Model used in media API to alter sorting/ordering of queried media
#[derive(Debug, Deserialize, JsonSchema)]
pub struct QueryOrder {
	/// The field to order by. Defaults to 'name'
	pub order_by: String,
	/// The order in which to sort, based on order_by. Defaults to 'Asc'
	pub direction: Direction,
}

impl Default for QueryOrder {
	fn default() -> Self {
		QueryOrder {
			order_by: "name".to_string(),
			direction: Direction::Asc,
		}
	}
}

impl From<PageParams> for QueryOrder {
	fn from(params: PageParams) -> Self {
		QueryOrder {
			order_by: params.order_by,
			direction: params.direction,
		}
	}
}

impl TryInto<media::OrderByParam> for QueryOrder {
	type Error = ApiError;

	fn try_into(self) -> Result<media::OrderByParam, Self::Error> {
		let dir: prisma_client_rust::Direction = self.direction.into();

		Ok(match self.order_by.to_lowercase().as_str() {
			"name" => media::name::order(dir),
			"size" => media::size::order(dir),
			"description" => media::description::order(dir),
			"extension" => media::extension::order(dir),
			"updated_at" => media::updated_at::order(dir),
			"path" => media::path::order(dir),
			"series_id" => media::series_id::order(dir),
			_ => {
				return Err(ApiError::BadRequest(format!(
					"You cannot order media by {:?}",
					self.order_by
				)))
			},
		})
	}
}

impl TryInto<series::OrderByParam> for QueryOrder {
	type Error = ApiError;

	fn try_into(self) -> Result<series::OrderByParam, Self::Error> {
		let dir: prisma_client_rust::Direction = self.direction.into();

		Ok(match self.order_by.to_lowercase().as_str() {
			"name" => series::name::order(dir),
			"description" => series::description::order(dir),
			"updated_at" => series::updated_at::order(dir),
			"path" => series::path::order(dir),
			"library_id" => series::library_id::order(dir),
			_ => {
				return Err(ApiError::BadRequest(format!(
					"You cannot order series by {:?}",
					self.order_by
				)))
			},
		})
	}
}
