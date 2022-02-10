use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[serde(crate = "rocket::serde")]
#[sea_orm(table_name = "server_preferences")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    /// Whether or not to attempt to rename scanned series according to a ComicInfo.xml file inside
    /// the directory. If none found, the series name will be the directory name.
    #[sea_orm(default_value = false)]
    pub rename_series: bool,
    /// Whether or not to attempt to convert scanned .cbr files to .cbz files.
    #[sea_orm(default_value = false)]
    pub convert_cbr_to_cbz: bool,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
