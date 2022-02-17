use rocket::serde::{Deserialize, Serialize};
use sea_orm::prelude::*;

#[derive(Copy, Clone, Eq, PartialEq, Debug, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[serde(crate = "rocket::serde")]
#[sea_orm(rs_type = "String", db_type = "String(None)")]
pub enum FileStatus {
    #[sea_orm(string_value = "UNKNOWN")]
    Unknown,
    #[sea_orm(string_value = "ERROR")]
    Error,
    #[sea_orm(string_value = "READY")]
    Ready,
    #[sea_orm(string_value = "UNSUPPORTED")]
    Unsupported,
    #[sea_orm(string_value = "OUTDATED")]
    Outdated,
    #[sea_orm(string_value = "MISSING")]
    Missing,
}

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

impl From<LogLevel> for String {
    fn from(level: LogLevel) -> String {
        match level {
            LogLevel::Error => "error".to_string(),
            LogLevel::Warn => "warn".to_string(),
            LogLevel::Info => "info".to_string(),
            LogLevel::Debug => "debug".to_string(),
        }
    }
}

impl From<&str> for LogLevel {
    fn from(level: &str) -> LogLevel {
        match level {
            "error" => LogLevel::Error,
            "warn" => LogLevel::Warn,
            "info" => LogLevel::Info,
            "debug" => LogLevel::Debug,
            _ => LogLevel::Error,
        }
    }
}
