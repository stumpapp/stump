use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "book_club_book_suggestion_likes")]
pub struct Model {
	#[sea_orm(primary_key)]
	pub id: i32,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub timestamp: DateTimeWithTimeZone,
	#[sea_orm(column_type = "Text")]
	pub liked_by_id: String,
	#[sea_orm(column_type = "Text")]
	pub suggestion_id: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(
		belongs_to = "super::book_club_book_suggestion::Entity",
		from = "Column::SuggestionId",
		to = "super::book_club_book_suggestion::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	BookClubBookSuggestion,
	#[sea_orm(
		belongs_to = "super::book_club_member::Entity",
		from = "Column::LikedById",
		to = "super::book_club_member::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	BookClubMember,
}

impl Related<super::book_club_book_suggestion::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubBookSuggestion.def()
	}
}

impl Related<super::book_club_member::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubMember.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}
