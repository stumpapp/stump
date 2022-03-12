use rocket::serde::{Deserialize, Serialize};
use sea_orm::{entity::prelude::*, SelectTwoMany};

use crate::{series, util::FileStatus};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[serde(crate = "rocket::serde", rename_all = "camelCase")]
#[sea_orm(table_name = "library")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    /// The name of the library. ex: "Marvel Comics"
    pub name: String,
    /// The location of the library in the fs. ex: "/home/user/media/comics/marvel"
    #[sea_orm(unique)]
    pub path: String,
    /// The status of the series since last scan or access
    #[sea_orm(default_value = FileStatus::Ready)]
    pub status: FileStatus,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::series::Entity")]
    Series,
}

impl Related<series::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Series.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

impl Entity {
    /// Finds a library by its id, and loads all its series.
    pub fn find_by_id(id: i32) -> SelectTwoMany<Entity, series::Entity> {
        Self::find()
            .filter(Column::Id.eq(id))
            .find_with_related(series::Entity)
    }

    /// Finds all libraries, and loads all their series.
    pub fn find_with_series() -> SelectTwoMany<Entity, series::Entity> {
        Self::find().find_with_related(series::Entity)
    }
}
