use rocket::serde::{Deserialize, Serialize};
use sea_orm::entity::prelude::*;

use crate::util::FileStatus;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[serde(crate = "rocket::serde", rename_all = "camelCase")]
#[sea_orm(table_name = "media")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    /// The id of the series this media belongs to.
    pub series_id: i32,
    /// name of the media. ex: "The Amazing Spider-Man (2018) #69.cbz"
    pub name: String,
    /// description of the media. ex: "Spidey and his superspy sister, Teresa Parker, dig to uncover THE CHAMELEON CONSPIRACY."
    pub description: Option<String>,
    /// the size of the media in bytes.
    pub size: i64,
    /// the file extension of the media. ex: "cbz"
    pub extension: String,
    /// the number of pages in the media. ex: "69"
    pub pages: i32,
    /// the date in which the media was last updated in the FS. ex: "2020-01-01"
    #[sea_orm(column_type = "DateTime")]
    pub updated_at: Option<chrono::NaiveDateTime>,
    /// whether or not the media is downloaded to the client. ex: true
    pub downloaded: bool,
    /// the checksum hash of the file contents. Used to ensure only one instance of a file in the database
    #[sea_orm(unique)]
    pub checksum: String,
    /// the path of the media. ex: "/home/user/media/comics/The Amazing Spider-Man (2018) #69.cbz"
    pub path: String,
    /// The status of the media since last scan or access
    #[sea_orm(default_value = FileStatus::Ready)]
    pub status: FileStatus,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::series::Entity",
        from = "Column::SeriesId"
        to="super::series::Column::Id"
    )]
    Series,

    #[sea_orm(has_many = "super::read_progress::Entity")]
    ReadProgress,
}

impl Related<super::series::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Series.def()
    }
}

impl Related<super::read_progress::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::ReadProgress.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
