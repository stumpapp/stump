use rocket::serde::{Deserialize, Serialize};
use sea_orm::entity::prelude::*;

use crate::util::LogLevel;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[serde(crate = "rocket::serde", rename_all = "camelCase")]
#[sea_orm(table_name = "logs")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    /// The level of the log.
    pub level: LogLevel,
    /// The message of the log.
    pub message: String,
    /// The timestamp of the log.
    #[sea_orm(column_type = "DateTime")]
    pub created_at: chrono::NaiveDateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
