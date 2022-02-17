use rocket::serde::{Deserialize, Serialize};
use sea_orm::entity::prelude::*;

// TODO: should I have a 'Contributor' role? Where they would have read+insert permissions?
#[derive(Debug, Clone, Serialize, Deserialize, EnumIter, DeriveActiveEnum, PartialEq)]
#[serde(crate = "rocket::serde")]
#[sea_orm(rs_type = "String", db_type = "String(None)")]
pub enum UserRole {
    /// The user who 'owns' the OPDS server
    #[sea_orm(string_value = "owner")]
    Owner,
    /// A user who has read access to the server
    #[sea_orm(string_value = "member")]
    Member,
}

impl Default for UserRole {
    fn default() -> Self {
        UserRole::Member
    }
}

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[serde(crate = "rocket::serde")]
#[sea_orm(table_name = "user")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    /// The username of the user. E.g. "oromei"
    #[sea_orm(unique)]
    pub username: String,
    /// The password of the user. This will a hash - not the actual password.
    pub password: String,
    /// The role of the user.
    #[sea_orm(default_value = "member")]
    pub role: UserRole,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::read_progress::Entity")]
    ReadProgress,
}

impl ActiveModelBehavior for ActiveModel {}
