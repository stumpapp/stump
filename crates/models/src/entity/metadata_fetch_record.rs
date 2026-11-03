use async_graphql::SimpleObject;
use chrono::Utc;
use sea_orm::{
	prelude::{async_trait::async_trait, *},
	ActiveValue, DeriveEntityModel,
};
use serde_json::Value as JsonValue;

use crate::shared::enums::MetadataFetchStatus;

use super::{media, series};

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "MetadataFetchRecordModel")]
#[sea_orm(table_name = "metadata_fetch_records")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = true)]
	pub id: i32,
	pub status: MetadataFetchStatus,
	#[sea_orm(column_type = "Text", nullable)]
	pub media_id: Option<String>, // null if this is for a series
	#[sea_orm(column_type = "Text", nullable)]
	pub series_id: Option<String>, // null if this is for a media
	#[sea_orm(column_type = "Json", nullable)]
	#[graphql(skip)]
	pub match_candidates: Option<JsonValue>,
	#[sea_orm(column_type = "Json", nullable)]
	#[graphql(skip)]
	pub accepted_match_candidate: Option<JsonValue>, // auto or manual
	/// The total number of raw hits reported by provider searches, across all
	/// providers searched. Compare against `match_candidates.len()` to detect when
	/// hits were dropped (e.g. a per-hit detail fetch failed after the initial search).
	pub raw_hits: i32,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub added_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub updated_at: Option<DateTimeWithTimeZone>,
	#[sea_orm(
		belongs_to,
		from = "media_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	#[graphql(skip)]
	pub media: BelongsTo<Option<media::Entity>>,
	#[sea_orm(
		belongs_to,
		from = "series_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	#[graphql(skip)]
	pub series: BelongsTo<Option<series::Entity>>,
}

#[async_trait]
impl ActiveModelBehavior for ActiveModel {
	async fn before_save<C>(mut self, _db: &C, insert: bool) -> Result<Self, DbErr>
	where
		C: ConnectionTrait,
	{
		if insert {
			if self.series_id.is_not_set() && self.media_id.is_not_set() {
				return Err(DbErr::Custom(
					"Either media_id or series_id must be set".to_string(),
				));
			}
			self.added_at = ActiveValue::Set(DateTimeWithTimeZone::from(Utc::now()));
			if self.status.is_not_set() {
				self.status = ActiveValue::Set(MetadataFetchStatus::NotStarted);
			}
			if self.raw_hits.is_not_set() {
				self.raw_hits = ActiveValue::Set(0);
			}
		} else {
			self.updated_at =
				ActiveValue::Set(Some(DateTimeWithTimeZone::from(Utc::now())));
		}

		Ok(self)
	}
}
