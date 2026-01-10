use async_graphql::SimpleObject;
use sea_orm::{entity::prelude::*, prelude::async_trait::async_trait, ActiveValue};

use crate::shared::readium::ReadiumLocator;

use super::user::AuthUser;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[sea_orm(table_name = "bookmarks")]
#[graphql(name = "BookmarkModel")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub preview_content: Option<String>,
	#[sea_orm(column_type = "Json", nullable)]
	pub locator: Option<ReadiumLocator>,
	#[sea_orm(column_type = "Text", nullable)]
	pub epubcfi: Option<String>,
	pub page: Option<i32>,
	#[sea_orm(column_type = "Text")]
	pub media_id: String,
	#[sea_orm(column_type = "Text")]
	pub user_id: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(
		belongs_to = "super::media::Entity",
		from = "Column::MediaId",
		to = "super::media::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	Media,
	#[sea_orm(
		belongs_to = "super::user::Entity",
		from = "Column::UserId",
		to = "super::user::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	User,
}

impl Related<super::media::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Media.def()
	}
}

impl Related<super::user::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::User.def()
	}
}

impl Entity {
	pub fn find_for_user(user: &AuthUser) -> Select<Entity> {
		Entity::find().filter(Column::UserId.eq(&user.id))
	}

	pub fn find_for_user_and_media_id(user: &AuthUser, media_id: &str) -> Select<Entity> {
		Entity::find()
			.filter(Column::UserId.eq(&user.id))
			.filter(Column::MediaId.eq(media_id))
	}
}

#[async_trait]
impl ActiveModelBehavior for ActiveModel {
	async fn before_save<C>(mut self, _db: &C, insert: bool) -> Result<Self, DbErr>
	where
		C: ConnectionTrait,
	{
		if insert && self.id.is_not_set() {
			self.id = ActiveValue::Set(Uuid::new_v4().to_string());
		}

		Ok(self)
	}
}
