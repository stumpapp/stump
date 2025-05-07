use async_graphql::Enum;
use strum::{Display, EnumString};

#[derive(PartialEq, Eq, Clone, Copy, Enum, EnumString, Display)]
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

pub trait OrderBy<ModelType: sea_orm::EntityTrait> {
	fn add_order_bys(
		&self,
		query: sea_orm::Select<ModelType>,
	) -> Result<sea_orm::Select<ModelType>, sea_orm::ColumnFromStrErr>;
}
