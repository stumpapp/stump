use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[serde(crate = "rocket::serde")]
#[sea_orm(table_name = "series")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    /// The title of the series. This is generated from a fs scan, and will be the directory name.
    pub title: String,
    /// The number of media files in the series.
    pub book_count: i32,
    /// The date in which the series was last updated in the FS. ex: "2020-01-01"
    pub updated_at: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::media::Entity")]
    Media,
}

impl Related<super::media::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Media.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
