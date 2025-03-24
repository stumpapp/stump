use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "book_club_schedules")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = true)]
	pub id: i32,
	pub default_interval_days: Option<i32>,
	pub book_club_id: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(has_many = "super::book_club_book::Entity")]
	BookClubBook,
	#[sea_orm(
		belongs_to = "super::book_club::Entity",
		from = "Column::BookClubId",
		to = "super::book_club::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	BookClub,
}

impl Related<super::book_club_book::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubBook.def()
	}
}

impl Related<super::book_club::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClub.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}
