use async_graphql::SimpleObject;
use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "EmailerSendRecordModel")]
#[sea_orm(table_name = "emailer_send_records")]
pub struct Model {
	#[sea_orm(primary_key)]
	pub id: i32,
	pub emailer_id: i32,
	#[sea_orm(column_type = "Text")]
	pub recipient_email: String,
	#[sea_orm(column_type = "Blob", nullable)]
	pub attachment_meta: Option<Vec<u8>>,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub sent_at: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub sent_by_user_id: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(
		belongs_to = "super::emailer::Entity",
		from = "Column::EmailerId",
		to = "super::emailer::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	Emailer,
	#[sea_orm(
		belongs_to = "super::user::Entity",
		from = "Column::SentByUserId",
		to = "super::user::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	User,
}

impl Related<super::emailer::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Emailer.def()
	}
}

impl Related<super::user::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::User.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}
