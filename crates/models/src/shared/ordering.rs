use async_graphql::Enum;
use serde::{Deserialize, Serialize};
use strum::{Display, EnumString};

#[derive(
	Debug, PartialEq, Eq, Clone, Copy, Enum, EnumString, Display, Serialize, Deserialize,
)]
pub enum OrderDirection {
	Asc,
	Desc,
}

impl From<OrderDirection> for sea_orm::Order {
	fn from(order: OrderDirection) -> Self {
		match order {
			OrderDirection::Asc => sea_orm::Order::Asc,
			OrderDirection::Desc => sea_orm::Order::Desc,
		}
	}
}

pub trait OrderBy<ModelType: sea_orm::EntityTrait, OrderByType> {
	fn add_order_by(
		order_by: &[OrderByType],
		query: sea_orm::Select<ModelType>,
	) -> Result<sea_orm::Select<ModelType>, sea_orm::ColumnFromStrErr>;
}
