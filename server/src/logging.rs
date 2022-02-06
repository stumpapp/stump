use rocket::serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogLevel {
    Error,
    Warn,
    Info,
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
}

impl Log {
    pub fn new(level: LogLevel, message: String) -> Log {
        Log { level, message }
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
