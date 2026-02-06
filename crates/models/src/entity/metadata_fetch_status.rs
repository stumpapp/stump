use async_graphql::SimpleObject;
use chrono::Utc;
use sea_orm::{
	prelude::{async_trait::async_trait, *},
	ActiveValue, DeriveEntityModel,
};

use crate::shared::enums::MetadataFetchStatus;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "MetadataFetchStatusModel")]
#[sea_orm(table_name = "metadata_fetch_statuses")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = true)]
	pub id: i32,
	// TODO: More fields
	pub status: MetadataFetchStatus,
	pub media_id: String,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub added_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub updated_at: Option<DateTimeWithTimeZone>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(has_one = "super::media::Entity")]
	Media,
}

impl Related<super::media::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Media.def()
	}
}

#[async_trait]
impl ActiveModelBehavior for ActiveModel {
	async fn before_save<C>(mut self, _db: &C, insert: bool) -> Result<Self, DbErr>
	where
		C: ConnectionTrait,
	{
		if insert {
			self.added_at = ActiveValue::Set(DateTimeWithTimeZone::from(Utc::now()));
			if self.status.is_not_set() {
				self.status = ActiveValue::Set(MetadataFetchStatus::NotStarted);
			}
		} else {
			self.updated_at =
				ActiveValue::Set(Some(DateTimeWithTimeZone::from(Utc::now())));
		}

		Ok(self)
	}
}
