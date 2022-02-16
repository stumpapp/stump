use rocket::serde::{Deserialize, Serialize};
use sea_orm::entity::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, EnumIter, DeriveActiveEnum, PartialEq)]
#[serde(crate = "rocket::serde")]
#[sea_orm(rs_type = "String", db_type = "String(None)")]
pub enum LogLevel {
    #[sea_orm(string_value = "error")]
    Error,
    #[sea_orm(string_value = "warn")]
    Warn,
    #[sea_orm(string_value = "info")]
    Info,
    #[sea_orm(string_value = "debug")]
    Debug,
}

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[serde(crate = "rocket::serde")]
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

// impl Into<ActiveModel> for Log {
//     fn into(self) -> ActiveModel {
//         ActiveModel {
//             level: Set(self.level),
//             message: Set(self.message),
//             created_at: Set(self.created_at),
//             ..Default::default()
//         }
//     }
// }
