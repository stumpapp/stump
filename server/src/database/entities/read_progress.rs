use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[serde(crate = "rocket::serde")]
#[sea_orm(table_name = "read_progress")]
pub struct Model {
    /// The id of the media this progress belongs to.
    #[sea_orm(primary_key)]
    pub media_id: i32,
    /// The id of the user this progress belongs to.
    #[sea_orm(primary_key)]
    pub user_id: i32,
    /// The current page of the media.
    pub page: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::UserId"
        to="super::user::Column::Id"
    )]
    User,

    #[sea_orm(
        belongs_to = "super::media::Entity",
        from = "Column::MediaId"
        to="super::media::Column::Id"
    )]
    Media,
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def()
    }
}

impl Related<super::media::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Media.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
