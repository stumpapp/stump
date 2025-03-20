use async_graphql::SimpleObject;
use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "FinishedReadingSessionModel")]
#[sea_orm(table_name = "finished_reading_sessions")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub started_at: String,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub completed_at: String,
	#[sea_orm(column_type = "Text")]
	pub media_id: String,
	#[sea_orm(column_type = "Text")]
	pub user_id: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub device_id: Option<String>,
	pub elapsed_seconds: Option<i64>,
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
	#[sea_orm(
		belongs_to = "super::registered_reading_device::Entity",
		from = "Column::DeviceId",
		to = "super::registered_reading_device::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	RegisteredReadingDevice,
	#[sea_orm(
		belongs_to = "super::user::Entity",
		from = "Column::UserId",
		to = "super::user::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	User,
}

impl Related<super::media::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Media.def()
	}
}

impl Related<super::registered_reading_device::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::RegisteredReadingDevice.def()
	}
}

impl Related<super::user::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::User.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}
