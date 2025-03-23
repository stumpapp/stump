use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "book_clubs")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text", unique)]
	pub name: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub description: Option<String>,
	pub is_private: bool,
	#[sea_orm(column_type = "Blob", nullable)]
	pub member_role_spec: Option<Vec<u8>>,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub created_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "Text", nullable)]
	pub emoji: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(has_many = "super::book_club_invitation::Entity")]
	BookClubInvitation,
	#[sea_orm(has_many = "super::book_club_member::Entity")]
	BookClubMember,
	#[sea_orm(has_one = "super::book_club_schedule::Entity")]
	BookClubSchedule,
}

impl Related<super::book_club_invitation::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubInvitation.def()
	}
}

impl Related<super::book_club_member::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubMember.def()
	}
}

impl Related<super::book_club_schedule::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubSchedule.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}
