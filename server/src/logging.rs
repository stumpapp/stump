use rocket::serde::{Deserialize, Serialize};
use sea_orm::{DeriveActiveEnum, EnumIter};

#[derive(Debug, Clone, Serialize, Deserialize, EnumIter, DeriveActiveEnum, PartialEq)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct Log {
    pub level: LogLevel,
    pub message: String,
    pub created_at: chrono::NaiveDateTime,
}

impl Log {
    pub fn new(level: LogLevel, message: String) -> Log {
        let now = chrono::Utc::now().naive_utc();
        Log {
            level,
            message,
            created_at: now,
        }
    }

    pub fn error(message: String) -> Log {
        Log::new(LogLevel::Error, message)
    }
    pub fn warn(message: String) -> Log {
        Log::new(LogLevel::Warn, message)
    }
    pub fn info(message: String) -> Log {
        Log::new(LogLevel::Info, message)
    }
    pub fn debug(message: String) -> Log {
        Log::new(LogLevel::Debug, message)
    }
}
