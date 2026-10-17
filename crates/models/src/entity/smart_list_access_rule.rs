use async_graphql::{Enum, SimpleObject};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use strum::{Display, EnumString};

use super::{smart_list, user};

/// 1: reader (read), 2: collaborator (read, edit), 3: co-creator (read, edit, delete)
#[derive(
	Eq,
	Copy,
	Hash,
	Debug,
	Clone,
	Default,
	EnumIter,
	PartialEq,
	Serialize,
	Deserialize,
	DeriveActiveEnum,
	EnumString,
	Display,
	Enum,
)]
#[sea_orm(
	rs_type = "String",
	rename_all = "SCREAMING_SNAKE_CASE",
	db_type = "Integer"
)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
pub enum SmartListAccessRole {
	#[default]
	Reader = 1,
	Collaborator = 2,
	CoCreator = 3,
}

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "SmartListAccessRuleModel")]
#[sea_orm(table_name = "smart_list_access_rules")]
pub struct Model {
	#[sea_orm(primary_key)]
	pub id: i32,
	pub role: SmartListAccessRole,
	#[sea_orm(column_type = "Text")]
	pub user_id: String,
	#[sea_orm(column_type = "Text")]
	pub smart_list_id: String,
	#[sea_orm(
		belongs_to,
		from = "smart_list_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	#[graphql(skip)]
	pub smart_list: BelongsTo<smart_list::Entity>,
	#[sea_orm(
		belongs_to,
		from = "user_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	#[graphql(skip)]
	pub user: BelongsTo<user::Entity>,
}

impl ActiveModelBehavior for ActiveModel {}
