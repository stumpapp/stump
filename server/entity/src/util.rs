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
    #[sea_orm(string_value = "ERROR")]
    Error,
    #[sea_orm(string_value = "WARN")]
    Warn,
    #[sea_orm(string_value = "INFO")]
    Info,
    #[sea_orm(string_value = "DEBUG")]
    Debug,
}

impl From<LogLevel> for String {
    fn from(level: LogLevel) -> String {
        match level {
            LogLevel::Error => "ERROR".to_string(),
            LogLevel::Warn => "WARN".to_string(),
            LogLevel::Info => "INFO".to_string(),
            LogLevel::Debug => "DEBUG".to_string(),
        }
    }
}

impl From<&str> for LogLevel {
    fn from(level: &str) -> LogLevel {
        match level {
            "ERROR" => LogLevel::Error,
            "WARN" => LogLevel::Warn,
            "INFO" => LogLevel::Info,
            "DEBUG" => LogLevel::Debug,
            _ => LogLevel::Error,
        }
    }
}
