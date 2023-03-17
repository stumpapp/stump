use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{
	prelude::errors::CoreError,
	prisma::{library, media, series},
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
			"description" => media::description::order(dir),
			"extension" => media::extension::order(dir),
			"updated_at" => media::updated_at::order(dir),
			"status" => media::status::order(dir),
			"path" => media::path::order(dir),
			"pages" => media::pages::order(dir),
			"series_id" => media::series_id::order(dir),
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

// pub trait FindManyTrait {
// 	fn paginated(self, page_params: PageParams) -> Self;
// }

// impl<Where, With, OrderBy, Cursor, Set, Data> FindManyTrait
// 	for FindMany<'_, Where, With, OrderBy, Cursor, Set, Data>
// where
// 	Where: Into<SerializedWhereInput>,
// 	With: Into<Selection>,
// 	OrderBy: Into<(String, PrismaValue)>,
// 	Cursor: Into<Where>,
// 	Set: Into<(String, PrismaValue)>,
// 	Data: DeserializeOwned,
// {
// 	fn paginated(self, page_params: PageParams) -> Self {
// 		let skip = match page_params.zero_based {
// 			true => page_params.page * page_params.page_size,
// 			false => (page_params.page - 1) * page_params.page_size,
// 		} as i64;

// 		let take = page_params.page_size as i64;

// 		self.skip(skip).take(take)
// 	}
// }
