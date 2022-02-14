use sea_orm::{DeriveActiveEnum, EnumIter};
use serde::{Deserialize, Serialize};

pub mod checksum;
pub mod epub;
pub mod error;
pub mod media_file;
pub mod new_scanner;
pub mod pdf;
pub mod rar;
pub mod scan;
pub mod zip;

#[derive(Copy, Clone, Eq, PartialEq, Debug, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
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
