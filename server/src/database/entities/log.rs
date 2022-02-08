use crate::logging::LogLevel;
use crate::Log;
use sea_orm::entity::prelude::*;
use sea_orm::ActiveValue::Set;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[serde(crate = "rocket::serde")]
#[sea_orm(table_name = "logs")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    /// The level of the log.
    pub level: LogLevel,
    /// The message of the log.
    #[sea_orm(unique)]
    pub message: String,
    /// The timestamp of the log.
    #[sea_orm(column_type = "DateTime")]
    pub created_at: chrono::NaiveDateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl Into<ActiveModel> for Log {
    fn into(self) -> ActiveModel {
        ActiveModel {
            level: Set(self.level),
            message: Set(self.message),
            created_at: Set(self.created_at),
            ..Default::default()
        }
    }
}
