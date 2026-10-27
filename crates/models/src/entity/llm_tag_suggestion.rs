use async_graphql::SimpleObject;
use chrono::Utc;
use sea_orm::{
	prelude::{async_trait::async_trait, *},
	ActiveValue, DeriveEntityModel,
};
use serde_json::Value as JsonValue;

use crate::shared::enums::LlmTagSuggestionStatus;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "LlmTagSuggestionModel")]
#[sea_orm(table_name = "llm_tag_suggestions")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = true)]
	pub id: i32,
	#[sea_orm(column_type = "Text")]
	pub media_id: String,
	pub status: LlmTagSuggestionStatus,
	/// JSON array of `{ name, confidence, reason }` objects
	#[sea_orm(column_type = "Json", nullable)]
	#[graphql(skip)]
	pub suggested_tags: Option<JsonValue>,
	/// JSON array of the tag names that were actually applied, if any
	#[sea_orm(column_type = "Json", nullable)]
	#[graphql(skip)]
	pub applied_tags: Option<JsonValue>,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub created_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub updated_at: Option<DateTimeWithTimeZone>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(
		belongs_to = "super::media::Entity",
		from = "Column::MediaId",
		to = "super::media::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
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
			self.created_at = ActiveValue::Set(DateTimeWithTimeZone::from(Utc::now()));
			if self.status.is_not_set() {
				self.status = ActiveValue::Set(LlmTagSuggestionStatus::Suggested);
			}
		} else {
			self.updated_at =
				ActiveValue::Set(Some(DateTimeWithTimeZone::from(Utc::now())));
		}

		Ok(self)
	}
}
