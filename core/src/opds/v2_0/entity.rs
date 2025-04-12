use models::{
	entity::{media, media_metadata, series, series_metadata},
	prefixer::{parse_query_to_model, parse_query_to_model_optional, Prefixer},
};
use sea_orm::{entity::prelude::*, FromQueryResult, QuerySelect};

#[derive(Clone, Debug)]
pub struct OPDSSeries {
	pub id: String,
	pub name: String,
	pub metadata: Option<series_metadata::Model>,
}

#[derive(Clone, Debug)]
pub struct OPDSPublicationEntity {
	pub media: media::Model,
	pub metadata: Option<media_metadata::Model>,
	pub series: OPDSSeries,
}

impl OPDSPublicationEntity {
	pub fn find() -> Select<media::Entity> {
		Prefixer::new(media::Entity::find().select_only())
			.add_columns(media::Entity)
			.add_columns(media_metadata::Entity)
			.add_named_columns(&[series::Column::Id, series::Column::Name], "series")
			.add_columns(series_metadata::Entity)
			.selector
			.left_join(media_metadata::Entity)
			.inner_join(series::Entity)
			.left_join(series_metadata::Entity)
	}
}

impl FromQueryResult for OPDSPublicationEntity {
	fn from_query_result(
		res: &sea_orm::QueryResult,
		_pre: &str,
	) -> Result<Self, sea_orm::DbErr> {
		let media = parse_query_to_model::<media::Model, media::Entity>(res)?;
		let media_metadata = parse_query_to_model_optional::<
			media_metadata::Model,
			media_metadata::Entity,
		>(res)?;
		let series_metadata = parse_query_to_model_optional::<
			series_metadata::Model,
			series_metadata::Entity,
		>(res)?;
		let series_name = res.try_get("series", "name")?;
		let series_id = res.try_get("series", "id")?;

		Ok(OPDSPublicationEntity {
			media,
			metadata: media_metadata,
			series: OPDSSeries {
				id: series_id,
				name: series_name,
				metadata: series_metadata,
			},
		})
	}
}
