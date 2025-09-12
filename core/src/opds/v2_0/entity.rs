use models::{
	entity::{
		library_exclusion,
		media::{self, get_age_restriction_filter},
		media_metadata, page_analysis, reading_session, registered_reading_device,
		series, series_metadata,
		user::AuthUser,
	},
	prefixer::{parse_query_to_model, parse_query_to_model_optional, Prefixer},
	shared::page_dimension::PageAnalysis,
};
use sea_orm::{entity::prelude::*, Condition, FromQueryResult, JoinType, QuerySelect};

#[derive(Clone, Debug)]
pub struct OPDSSeries {
	pub id: String,
	pub name: String,
	pub metadata: Option<series_metadata::Model>,
}

// TODO: Move this to a shared location between 1.2 and 2.0
#[derive(Clone, Debug)]
pub struct OPDSPublicationEntity {
	pub media: media::Model,
	pub metadata: Option<media_metadata::Model>,
	pub series: OPDSSeries,
	pub reading_session: Option<reading_session::Model>,
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

		let for_user_id = user.id.clone();
		Prefixer::new(media::Entity::find().select_only())
			.add_columns(media::Entity)
			.add_columns(media_metadata::Entity)
			.add_columns(series::Entity)
			.add_columns(series_metadata::Entity)
			.add_columns(reading_session::Entity)
			.selector
			.filter(series::Column::LibraryId.not_in_subquery(
				library_exclusion::Entity::library_hidden_to_user_query(user),
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
			.join_rev(
				JoinType::LeftJoin,
				reading_session::Entity::belongs_to(media::Entity)
					.from(reading_session::Column::MediaId)
					.to(media::Column::Id)
					.on_condition(move |_left, _right| {
						Condition::all()
							.add(reading_session::Column::UserId.eq(for_user_id.clone()))
					})
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
		let reading_session = parse_query_to_model_optional::<
			reading_session::Model,
			reading_session::Entity,
		>(res)?;

		Ok(OPDSPublicationEntity {
			media,
			metadata: media_metadata,
			series: OPDSSeries {
				id: series_id,
				name: series_name,
				metadata: series_metadata,
			},
			reading_session,
		})
	}
}

#[derive(Clone, Debug, FromQueryResult)]
pub struct OPDSProgressionBookRef {
	pub id: String,
	pub extension: String,
	pub pages: i32,
	pub analysis: Option<PageAnalysis>,
}

pub struct OPDSProgressionEntity {
	pub session: reading_session::Model,
	pub device: Option<registered_reading_device::Model>,
	pub book: OPDSProgressionBookRef,
}

impl OPDSProgressionEntity {
	pub fn find() -> Select<reading_session::Entity> {
		Prefixer::new(reading_session::Entity::find().select_only())
			.add_columns(reading_session::Entity)
			.add_columns(registered_reading_device::Entity)
			.add_named_columns(
				&[
					media::Column::Id,
					media::Column::Extension,
					media::Column::Pages,
				],
				"bookref",
			)
			.add_named_columns(&[page_analysis::Column::Data], "bookref")
			.selector
			.left_join(registered_reading_device::Entity)
			.inner_join(media::Entity)
			.join_rev(
				JoinType::LeftJoin,
				page_analysis::Entity::belongs_to(media::Entity)
					.from(page_analysis::Column::MediaId)
					.to(media::Column::Id)
					.into(),
			)
	}
}

impl FromQueryResult for OPDSProgressionEntity {
	fn from_query_result(
		res: &sea_orm::QueryResult,
		_pre: &str,
	) -> Result<Self, sea_orm::DbErr> {
		let session =
			parse_query_to_model::<reading_session::Model, reading_session::Entity>(res)?;
		let device = parse_query_to_model_optional::<
			registered_reading_device::Model,
			registered_reading_device::Entity,
		>(res)?;
		let book = OPDSProgressionBookRef::from_query_result(res, "bookref")?;

		Ok(OPDSProgressionEntity {
			session,
			device,
			book,
		})
	}
}
