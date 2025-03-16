use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "reading_lists")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text")]
	pub name: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub description: Option<String>,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub updated_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "Text")]
	pub visibility: String,
	#[sea_orm(column_type = "Text")]
	pub ordering: String,
	#[sea_orm(column_type = "Text")]
	pub creating_user_id: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(has_many = "super::reading_list_item::Entity")]
	ReadingListItems,
	#[sea_orm(has_many = "super::reading_list_rule::Entity")]
	ReadingListRules,
	#[sea_orm(
		belongs_to = "super::user::Entity",
		from = "Column::CreatingUserId",
		to = "super::user::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	User,
}

impl Related<super::reading_list_item::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::ReadingListItems.def()
	}
}

impl Related<super::reading_list_rule::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::ReadingListRules.def()
	}
}

impl Related<super::user::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::User.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}
