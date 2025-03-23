use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "book_club_books")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub start_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub end_at: DateTimeWithTimeZone,
	pub discussion_duration_days: Option<i32>,
	#[sea_orm(column_type = "Text", nullable)]
	pub title: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub author: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub url: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub book_entity_id: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub book_club_schedule_book_club_id: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub image_url: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(has_one = "super::book_club_discussion::Entity")]
	BookClubDiscussion,
	#[sea_orm(
		belongs_to = "super::book_club_schedule::Entity",
		from = "Column::BookClubScheduleBookClubId",
		to = "super::book_club_schedule::Column::BookClubId",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	BookClubSchedule,
	#[sea_orm(
		belongs_to = "super::media::Entity",
		from = "Column::BookEntityId",
		to = "super::media::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	Media,
}

impl Related<super::book_club_discussion::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubDiscussion.def()
	}
}

impl Related<super::book_club_schedule::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubSchedule.def()
	}
}

impl Related<super::media::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Media.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}
