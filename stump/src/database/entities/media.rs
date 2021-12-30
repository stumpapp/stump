// use async_graphql::*;
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Copy, Clone, Eq, PartialEq, Debug, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "String(None)")]
pub enum MediaStatus {
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
}

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[serde(crate = "rocket::serde")]
// #[graphql(concrete(name = "Media", params()))]
#[sea_orm(table_name = "media")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    /// The id of the library this media belongs to.
    pub library_id: i32,
    /// name of the media. ex: "The Matrix"
    pub name: String,
    /// description of the media. ex: "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers."
    pub description: Option<String>,
    /// the year in which the media was released. ex: 1999
    pub year: Option<i64>,
    /// the date in which the media was added to the FS. ex: "2020-01-01"
    pub added_at: Option<String>,
    /// whether or not the media is downloaded to the client. ex: true
    pub downloaded: bool,
    /// the url of the media. ex: "/home/user/media/movies/The Matrix.mkv"
    pub url: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::library::Entity",
        from = "Column::LibraryId"
        to="super::library::Column::Id"
    )]
    Library,
}

impl Related<super::library::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Library.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
