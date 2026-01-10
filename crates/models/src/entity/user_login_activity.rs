use async_graphql::SimpleObject;
use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[sea_orm(table_name = "user_login_activity")]
#[graphql(name = "UserLoginActivityModel")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = true)]
	pub id: i64,
	#[sea_orm(column_type = "Text")]
	pub ip_address: String,
	#[sea_orm(column_type = "Text")]
	pub user_agent: String,
	pub authentication_successful: bool,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub timestamp: DateTimeWithTimeZone,
	#[sea_orm(column_type = "Text")]
	pub user_id: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(
		belongs_to = "super::user::Entity",
		from = "Column::UserId",
		to = "super::user::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	User,
}

impl Related<super::user::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::User.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}
