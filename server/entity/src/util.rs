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
