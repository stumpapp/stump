use entity::sea_orm::Set;
use entity::util::LogLevel;
use rocket::serde::{Deserialize, Serialize};

pub trait LogTrait {
    fn into_active_model(&self) -> entity::log::ActiveModel;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct Log {
    pub level: LogLevel,
    pub message: String,
    pub created_at: chrono::NaiveDateTime,
}

impl LogTrait for Log {
    fn into_active_model(&self) -> entity::log::ActiveModel {
        entity::log::ActiveModel {
            level: Set(self.level.to_owned()),
            message: Set(self.message.to_owned()),
            created_at: Set(self.created_at.to_owned()),
            ..Default::default()
        }
    }
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
