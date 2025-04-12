use models::{
	entity::{
		library_hidden_to_user,
		media::{self, get_age_restriction_filter},
		media_metadata, series, series_metadata,
		user::AuthUser,
	},
	prefixer::{parse_query_to_model, parse_query_to_model_optional, Prefixer},
};
use sea_orm::{entity::prelude::*, Condition, FromQueryResult, JoinType, QuerySelect};

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
			.join_rev(
				JoinType::LeftJoin,
				series_metadata::Entity::belongs_to(series::Entity)
					.from(series_metadata::Column::SeriesId)
					.to(series::Column::Id)
					.into(),
			)
	}

	pub fn find_for_user(user: &AuthUser) -> Select<media::Entity> {
		let age_restriction_filter = user
			.age_restriction
			.as_ref()
			.map(|res| get_age_restriction_filter(res.age, res.restrict_on_unset));

		Prefixer::new(media::Entity::find().select_only())
			.add_columns(media::Entity)
			.add_columns(media_metadata::Entity)
			.add_columns(series::Entity)
			.add_columns(series_metadata::Entity)
			.selector
			.filter(series::Column::LibraryId.not_in_subquery(
				library_hidden_to_user::Entity::library_hidden_to_user_query(user),
			))
			.filter(Condition::all().add_option(age_restriction_filter))
			.left_join(media_metadata::Entity)
			.inner_join(series::Entity)
			.join_rev(
				JoinType::LeftJoin,
				series_metadata::Entity::belongs_to(series::Entity)
					.from(series_metadata::Column::SeriesId)
					.to(series::Column::Id)
					.into(),
			)
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
