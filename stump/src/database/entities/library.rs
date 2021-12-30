use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Copy, Clone, Eq, PartialEq, Debug, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "String(None)")]
pub enum MediaType {
    #[sea_orm(string_value = "MOVIE")]
    Movie,
    #[sea_orm(string_value = "TV")]
    Tv,
    #[sea_orm(string_value = "MUSIC")]
    Music,
    #[sea_orm(string_value = "AUDIO")]
    Audio,
}

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[serde(crate = "rocket::serde")]
#[sea_orm(table_name = "library")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    /// The name of the library. ex: "Movies"
    pub name: String,
    /// the location of the directory on disk. ex: "/home/user/media/movies"
    pub directory: String,
    /// the type of media the library contains. ex: "MOVIE"
    #[sea_orm(column_name = "media_type")]
    pub media_type: MediaType,
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
