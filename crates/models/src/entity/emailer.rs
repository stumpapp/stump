use async_graphql::SimpleObject;
use sea_orm::entity::prelude::*;

use super::emailer_send_record;

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "EmailerModel")]
#[sea_orm(table_name = "emailers")]
pub struct Model {
	#[sea_orm(primary_key)]
	pub id: i32,
	#[sea_orm(column_type = "Text", unique)]
	pub name: String,
	pub is_primary: bool,
	#[sea_orm(column_type = "Text")]
	pub sender_email: String,
	#[sea_orm(column_type = "Text")]
	pub sender_display_name: String,
	#[sea_orm(column_type = "Text")]
	pub username: String,
	#[graphql(skip)]
	#[sea_orm(column_type = "Text")]
	pub encrypted_password: String,
	#[sea_orm(column_type = "Text")]
	pub smtp_host: String,
	pub smtp_port: i32,
	pub tls_enabled: bool,
	pub max_attachment_size_bytes: Option<i32>,
	pub max_num_attachments: Option<i32>,
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub last_used_at: Option<DateTimeWithTimeZone>,
	#[sea_orm(has_many)]
	#[graphql(skip)]
	pub send_records: HasMany<emailer_send_record::Entity>,
}

impl ActiveModelBehavior for ActiveModel {}
