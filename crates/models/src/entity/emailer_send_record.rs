use async_graphql::SimpleObject;
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

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
	#[graphql(skip)]
	pub attachment_meta: Option<Vec<u8>>,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub sent_at: DateTimeWithTimeZone,
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

/// The metadata of an attachment that was sent with an email
#[derive(Debug, Serialize, Deserialize, SimpleObject)]
pub struct AttachmentMetaModel {
	/// The filename of the attachment
	pub filename: String,
	/// The associated media ID of the attachment, if there is one
	pub media_id: Option<String>,
	/// The size of the attachment in bytes
	pub size: i32,
}

impl AttachmentMetaModel {
	/// Create a new attachment meta
	pub fn new(filename: String, media_id: Option<String>, size: i32) -> Self {
		Self {
			filename,
			media_id,
			size,
		}
	}

	pub fn vec_from_data(
		data: &[u8],
	) -> Result<Vec<AttachmentMetaModel>, sea_orm::DbErr> {
		serde_json::from_slice(data).map_err(|e| {
			sea_orm::DbErr::Custom(format!(
				"Failed to deserialize attachment meta: {}",
				e
			))
		})
	}

	/// Convert the attachment meta into a byte array, wrapped in a vec
	pub fn into_data(
		attachment_metas: &Vec<AttachmentMetaModel>,
	) -> Result<Vec<u8>, sea_orm::DbErr> {
		serde_json::to_vec(attachment_metas).map_err(|e| {
			sea_orm::DbErr::Custom(format!("Failed to serialize attachment meta: {}", e))
		})
	}
}
