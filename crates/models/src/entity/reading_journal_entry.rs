use async_graphql::SimpleObject;
use chrono::Utc;
use sea_orm::{
	prelude::{async_trait::async_trait, *},
	ActiveValue, DeriveEntityModel, FromJsonQueryResult,
};
use serde::{Deserialize, Serialize};

use crate::shared::readium::ReadiumLocator;

// TODO: rename reading_session_entries? aligns with reading_session? keep as-is?
// replace all and just merge into something else? e.g. a unified reading_session?
//
// ^ i wrote this model hours before jotting down rough notes for a world where we have a unifed
// session model. considering that route, but need to think through holistically more first. in that
// world, i also imagine something like attaching a reading_session_id fk to annotations/highlights/etc
// so we can track that together but kept a record-level notes for satisfying the daily note aspect of the req

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, FromJsonQueryResult)]
pub struct DeviceIds(pub Vec<String>);

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "ReadingJournalEntryModel")]
#[sea_orm(table_name = "reading_journal_entries")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = true)]
	pub id: i32,

	#[sea_orm(column_type = "Text", nullable)]
	pub notes: Option<String>,
	/// to enforce one entry per user-book-session per "day" (which considers the user's preferred reset hour)
	pub session_date: Date,

	// TODO: consider a ReadingSessionLocator that is an enum for Paged vs Readium? only if i don't think i would ever filter/query
	// based on these fields (probably not)
	pub start_page: Option<i32>,
	pub end_page: Option<i32>,
	pub start_locator: Option<ReadiumLocator>,
	pub end_locator: Option<ReadiumLocator>,

	pub elapsed_seconds: Option<i64>,
	#[sea_orm(default_value = "1")]
	pub readthrough_number: i32,

	#[sea_orm(column_type = "Text")]
	pub media_id: String,
	#[sea_orm(column_type = "Text")]
	pub user_id: String,
	/// all devices that contributed to this entry
	#[graphql(skip)]
	#[sea_orm(column_type = "Json", nullable)]
	pub device_ids: Option<DeviceIds>,

	/// the time the entry was created, but should also refer to the session start time
	pub created_at: DateTimeWithTimeZone,
	pub updated_at: Option<DateTimeWithTimeZone>, // should not be used for last syncs
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

#[async_trait]
impl ActiveModelBehavior for ActiveModel {
	async fn before_save<C>(mut self, _db: &C, insert: bool) -> Result<Self, DbErr>
	where
		C: ConnectionTrait,
	{
		if insert {
			self.created_at = ActiveValue::Set(DateTimeWithTimeZone::from(Utc::now()));
		} else {
			self.updated_at =
				ActiveValue::Set(Some(DateTimeWithTimeZone::from(Utc::now())));
		}

		Ok(self)
	}
}
