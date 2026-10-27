use async_graphql::SimpleObject;
use chrono::Utc;
use sea_orm::{
	prelude::{async_trait::async_trait, *},
	ActiveValue, DeriveEntityModel,
};
use serde_json::Value as JsonValue;

use crate::shared::enums::LlmLibraryTagDraftStatus;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "LlmLibraryTagDraftModel")]
#[sea_orm(table_name = "llm_library_tag_drafts")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = true)]
	pub id: i32,
	#[sea_orm(column_type = "Text")]
	pub library_id: String,
	pub status: LlmLibraryTagDraftStatus,
	/// JSON array of the final global tag vocabulary produced by the analysis
	#[sea_orm(column_type = "Json", nullable)]
	pub final_tag_list: Option<JsonValue>,
	/// JSON array of `{ mediaId, tags }` assignment objects
	#[sea_orm(column_type = "Json", nullable)]
	#[graphql(skip)]
	pub assignments: Option<JsonValue>,
	/// The number of books with at least one suggested tag
	pub books_analyzed: i32,
	/// Resume cursor: the number of batches already completed
	pub completed_batches: i32,
	/// The total number of batches planned for this run
	pub total_batches: i32,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub created_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub updated_at: Option<DateTimeWithTimeZone>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(
		belongs_to = "super::library::Entity",
		from = "Column::LibraryId",
		to = "super::library::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	Library,
}

impl Related<super::library::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Library.def()
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
				self.status = ActiveValue::Set(LlmLibraryTagDraftStatus::InProgress);
			}
			if self.books_analyzed.is_not_set() {
				self.books_analyzed = ActiveValue::Set(0);
			}
			if self.completed_batches.is_not_set() {
				self.completed_batches = ActiveValue::Set(0);
			}
			if self.total_batches.is_not_set() {
				self.total_batches = ActiveValue::Set(0);
			}
		} else {
			self.updated_at =
				ActiveValue::Set(Some(DateTimeWithTimeZone::from(Utc::now())));
		}

		Ok(self)
	}
}
