use std::str::FromStr;

use async_graphql::{InputObject, OneofObject};
use heck::ToSnakeCase;
use models::{
	entity::{media, media_metadata, series, series_metadata},
	shared::ordering::{OrderBy, OrderDirection},
};
use sea_orm::QueryOrder;

#[derive(InputObject, Clone)]
#[graphql(concrete(name = "MediaOrderByField", params(media::MediaModelOrdering)))]
#[graphql(concrete(name = "SeriesOrderByField", params(series::SeriesModelOrdering)))]
#[graphql(concrete(
	name = "MediaMetadataOrderByField",
	params(media_metadata::MediaMetadataModelOrdering)
))]
#[graphql(concrete(
	name = "SeriesMetadataOrderByField",
	params(series_metadata::SeriesMetadataModelOrdering)
))]
pub struct OrderByField<OrderBy: Send + Sync + async_graphql::InputType> {
	pub field: OrderBy,
	pub direction: OrderDirection,
}

#[derive(OneofObject, Clone)]
pub enum MediaOrderBy {
	Media(OrderByField<media::MediaModelOrdering>),
	Metadata(OrderByField<media_metadata::MediaMetadataModelOrdering>),
}

#[derive(OneofObject, Clone)]
pub enum SeriesOrderBy {
	Series(OrderByField<series::SeriesModelOrdering>),
	Metadata(OrderByField<series_metadata::SeriesMetadataModelOrdering>),
}

impl Default for MediaOrderBy {
	fn default() -> Self {
		MediaOrderBy::Media(OrderByField {
			field: media::MediaModelOrdering::Name,
			direction: OrderDirection::Asc,
		})
	}
}

impl Default for SeriesOrderBy {
	fn default() -> Self {
		SeriesOrderBy::Series(OrderByField {
			field: series::SeriesModelOrdering::Name,
			direction: OrderDirection::Asc,
		})
	}
}

impl OrderBy<media::Entity, MediaOrderBy> for MediaOrderBy {
	fn add_order_by(
		order_by: &[Self],
		query: sea_orm::Select<media::Entity>,
	) -> Result<sea_orm::Select<media::Entity>, sea_orm::ColumnFromStrErr> {
		let mut query = query;
		// TODO:(graphql) this is hacky, it should done as a direct column match
		for order in order_by {
			match order {
				MediaOrderBy::Media(order_by) => {
					let order = sea_orm::Order::from(order_by.direction);
					let field = media::Column::from_str(
						&order_by.field.to_string().to_snake_case(),
					)?;
					query = query.order_by(field, order)
				},
				MediaOrderBy::Metadata(order_by) => {
					let order = sea_orm::Order::from(order_by.direction);
					let field = media_metadata::Column::from_str(
						&order_by.field.to_string().to_snake_case(),
					)?;
					query = query.order_by(field, order);
				},
			}
		}
		Ok(query)
	}
}

impl MediaOrderBy {
	pub fn default_vec() -> Vec<Self> {
		vec![MediaOrderBy::default()]
	}
}

impl OrderBy<series::Entity, SeriesOrderBy> for SeriesOrderBy {
	fn add_order_by(
		order_by: &[Self],
		query: sea_orm::Select<series::Entity>,
	) -> Result<sea_orm::Select<series::Entity>, sea_orm::ColumnFromStrErr> {
		let mut query = query;
		// TODO:(graphql) this is hacky, it should done as a direct column match
		for order in order_by {
			match order {
				SeriesOrderBy::Series(order_by) => {
					let order = sea_orm::Order::from(order_by.direction);
					let field = series::Column::from_str(
						&order_by.field.to_string().to_snake_case(),
					)?;
					query = query.order_by(field, order)
				},
				SeriesOrderBy::Metadata(order_by) => {
					let order = sea_orm::Order::from(order_by.direction);
					let field = series_metadata::Column::from_str(
						&order_by.field.to_string().to_snake_case(),
					)?;
					query = query.order_by(field, order);
				},
			}
		}
		Ok(query)
	}
}

impl SeriesOrderBy {
	pub fn default_vec() -> Vec<Self> {
		vec![SeriesOrderBy::default()]
	}
}
