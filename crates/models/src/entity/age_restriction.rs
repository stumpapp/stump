use async_graphql::SimpleObject;
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

use super::user;

#[sea_orm::model]
#[derive(
	Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject, Serialize, Deserialize,
)]
#[serde(rename_all = "camelCase")]
#[graphql(name = "AgeRestriction")]
#[sea_orm(table_name = "age_restrictions")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = true)]
	pub id: i32,
	pub age: i32,
	pub restrict_on_unset: bool,
	#[sea_orm(column_type = "Text", unique)]
	pub user_id: String,
	#[sea_orm(
		belongs_to,
		from = "user_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	#[graphql(skip)]
	#[serde(skip)]
	pub user: BelongsTo<user::Entity>,
}

impl ActiveModelBehavior for ActiveModel {}
