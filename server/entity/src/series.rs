use rocket::serde::{Deserialize, Serialize};
use sea_orm::entity::prelude::*;
use sea_orm::{EntityTrait, JoinType, QueryFilter, QuerySelect, SelectTwoMany};

use crate::media;
use crate::util::FileStatus;

// use crate::fs::FileStatus;
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[serde(crate = "rocket::serde", rename_all = "camelCase")]
#[sea_orm(table_name = "series")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    /// The id of the library this series belongs to.
    pub library_id: i32,
    /// The title of the series. This is generated from a fs scan, and will be the directory name.
    pub title: String,
    // /// The number of media files in the series.
    // pub book_count: i32,
    /// The date in which the series was last updated in the FS. ex: "2020-01-01"
    #[sea_orm(column_type = "DateTime")]
    pub updated_at: Option<chrono::NaiveDateTime>,
    /// The url of the series. ex: "/home/user/media/comics/The Amazing Spider-Man"
    pub path: String,
    /// The status of the series since last scan or access
    #[sea_orm(default_value = FileStatus::Ready)]
    pub status: FileStatus,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::media::Entity")]
    Media,

    #[sea_orm(
        belongs_to = "super::library::Entity",
        from = "Column::LibraryId"
        to="super::library::Column::Id"
    )]
    Library,
}

impl Related<super::media::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Media.def()
    }
}

impl Related<super::library::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Library.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

impl Entity {
    pub fn find_by_id(id: i32) -> Select<Entity> {
        Self::find().filter(Column::Id.eq(id))
    }

    pub fn find_with_media() -> SelectTwoMany<Entity, media::Entity> {
        Self::find().find_with_related(media::Entity)
    }

    pub fn find_with_book_count() -> Select<Entity> {
        Self::find()
            .column_as(media::Column::SeriesId.count(), "book_count")
            .join_rev(
                JoinType::InnerJoin,
                media::Entity::belongs_to(Entity)
                    .from(media::Column::SeriesId)
                    .to(Column::Id)
                    .into(),
            )
            .group_by(media::Column::SeriesId)
    }
}

impl Into<Model> for (Model, Vec<media::Model>) {
    fn into(self) -> Model {
        Model {
            id: self.0.id,
            library_id: self.0.library_id,
            title: self.0.title,
            // book_count: self.1.len() as i32,
            updated_at: self.0.updated_at,
            path: self.0.path,
            status: self.0.status,
        }
    }
}
