use sea_orm::{entity::prelude::*, FromQueryResult};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "server_config")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = true)]
	pub id: i32,
	#[sea_orm(column_type = "Text", nullable)]
	pub public_url: Option<String>,
	pub initial_wal_setup_complete: bool,
	#[sea_orm(column_type = "Text", nullable)]
	pub encryption_key: Option<String>,
}

#[derive(FromQueryResult)]
pub struct EncryptionKeySelect {
	pub encryption_key: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
