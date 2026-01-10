use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "registered_reading_devices")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text", unique)]
	pub name: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub kind: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(has_many = "super::finished_reading_session::Entity")]
	FinishedReadingSession,
	#[sea_orm(has_many = "super::reading_session::Entity")]
	ReadingSession,
}

impl Related<super::finished_reading_session::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::FinishedReadingSession.def()
	}
}

impl Related<super::reading_session::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::ReadingSession.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}
