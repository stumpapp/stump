use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{
	error::CoreError,
	prisma::{job, library, log, media, series},
};

#[derive(Debug, Default, Serialize, Deserialize, Clone, Type, ToSchema)]
pub enum Direction {
	#[serde(rename = "asc")]
	Asc,
	#[serde(rename = "desc")]
	#[default]
	Desc,
}

impl From<Direction> for prisma_client_rust::Direction {
	fn from(direction: Direction) -> prisma_client_rust::Direction {
		match direction {
			Direction::Asc => prisma_client_rust::Direction::Asc,
			Direction::Desc => prisma_client_rust::Direction::Desc,
		}
	}
}

/// Model used in media API to alter sorting/ordering of queried media
#[derive(Debug, Deserialize, Serialize, Type, ToSchema)]
#[serde(default)]
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

impl TryInto<media::OrderByParam> for QueryOrder {
	type Error = CoreError;

	fn try_into(self) -> Result<media::OrderByParam, Self::Error> {
		let dir: prisma_client_rust::Direction = self.direction.into();

		Ok(match self.order_by.to_lowercase().as_str() {
			"name" => media::name::order(dir),
			"size" => media::size::order(dir),
			"extension" => media::extension::order(dir),
			"updated_at" => media::updated_at::order(dir),
			"status" => media::status::order(dir),
			"path" => media::path::order(dir),
			"pages" => media::pages::order(dir),
			"series_id" => media::series_id::order(dir),
			"created_at" => media::created_at::order(dir),
			_ => {
				return Err(CoreError::InvalidQuery(format!(
					"You cannot order media by {:?}",
					self.order_by
				)))
			},
		})
	}
}

impl TryInto<library::OrderByParam> for QueryOrder {
	type Error = CoreError;

	fn try_into(self) -> Result<library::OrderByParam, Self::Error> {
		let dir: prisma_client_rust::Direction = self.direction.into();

		Ok(match self.order_by.to_lowercase().as_str() {
			"name" => library::name::order(dir),
			"path" => library::path::order(dir),
			"status" => library::status::order(dir),
			"updated_at" => library::updated_at::order(dir),
			"created_at" => library::created_at::order(dir),
			_ => {
				return Err(CoreError::InvalidQuery(format!(
					"You cannot order library by {:?}",
					self.order_by
				)))
			},
		})
	}
}

impl TryInto<series::OrderByParam> for QueryOrder {
	type Error = CoreError;

	fn try_into(self) -> Result<series::OrderByParam, Self::Error> {
		let dir: prisma_client_rust::Direction = self.direction.into();

		Ok(match self.order_by.to_lowercase().as_str() {
			"name" => series::name::order(dir),
			"description" => series::description::order(dir),
			"updated_at" => series::updated_at::order(dir),
			"created_at" => series::created_at::order(dir),
			"path" => series::path::order(dir),
			"status" => series::status::order(dir),
			"library_id" => series::library_id::order(dir),
			_ => {
				return Err(CoreError::InvalidQuery(format!(
					"You cannot order series by {:?}",
					self.order_by
				)))
			},
		})
	}
}

impl TryInto<job::OrderByParam> for QueryOrder {
	type Error = CoreError;

	fn try_into(self) -> Result<job::OrderByParam, Self::Error> {
		let dir: prisma_client_rust::Direction = self.direction.into();

		Ok(match self.order_by.to_lowercase().as_str() {
			"name" => job::name::order(dir),
			"status" => job::status::order(dir),
			"created_at" => job::created_at::order(dir),
			"completed_at" => job::completed_at::order(dir),
			_ => {
				return Err(CoreError::InvalidQuery(format!(
					"You cannot order jobs by {:?}",
					self.order_by
				)))
			},
		})
	}
}

impl TryInto<log::OrderByParam> for QueryOrder {
	type Error = CoreError;

	fn try_into(self) -> Result<log::OrderByParam, Self::Error> {
		let dir: prisma_client_rust::Direction = self.direction.into();

		Ok(match self.order_by.to_lowercase().as_str() {
			"timestamp" => log::timestamp::order(dir),
			"level" => log::level::order(dir),
			"message" => log::message::order(dir),
			"job_id" => log::job_id::order(dir),
			_ => {
				return Err(CoreError::InvalidQuery(format!(
					"You cannot order logs by {:?}",
					self.order_by
				)))
			},
		})
	}
}
