use async_graphql::SimpleObject;
use chrono::Utc;
use sea_orm::{
	entity::prelude::*, prelude::async_trait::async_trait, ActiveValue,
	DeriveEntityModel, FromJsonQueryResult, QueryOrder, QuerySelect,
};
use serde::{Deserialize, Serialize};

use crate::shared::readium::ReadiumLocator;

use super::user::AuthUser;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, FromJsonQueryResult)]
pub struct DeviceIds(pub Vec<String>);

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "ReadingSessionModel")]
#[sea_orm(table_name = "reading_sessions_v2")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = true)]
	pub id: i32,

	/// the "logical" date of this session, based on user prefs and start time
	pub session_date: Date,

	#[graphql(
		deprecation = "future releases of Stump will remove support for this field"
	)]
	#[sea_orm(column_type = "Text", nullable)]
	pub epubcfi: Option<String>,

	#[sea_orm(column_type = "Json", nullable)]
	pub start_locator: Option<ReadiumLocator>,
	#[sea_orm(column_type = "Json", nullable)]
	pub end_locator: Option<ReadiumLocator>,

	pub start_page: Option<i32>,
	pub end_page: Option<i32>,

	pub start_percentage: Option<Decimal>,
	pub end_percentage: Option<Decimal>,

	#[sea_orm(column_type = "Text", nullable)]
	pub koreader_progress: Option<String>,
	/// accumulated reading time for this session, updated via deltas (not overwritten)
	pub elapsed_seconds: Option<i64>,

	/// which read-through of this book this session belongs to (1-indexed)
	#[sea_orm(default_value = "1")]
	pub readthrough_number: i32,

	/// whether the book was completed during this session
	pub did_complete: bool,

	// TODO: could make this a relation, instead, for multi-note support?
	#[sea_orm(column_type = "Text", nullable)]
	pub notes: Option<String>,

	/// all device ids that contributed updates to this session
	#[graphql(skip)]
	#[sea_orm(column_type = "Json", nullable)]
	pub device_ids: Option<DeviceIds>,

	#[sea_orm(column_type = "Text")]
	pub media_id: String,
	#[sea_orm(column_type = "Text")]
	pub user_id: String,

	pub created_at: DateTimeWithTimeZone,
	pub updated_at: Option<DateTimeWithTimeZone>,
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

	pub fn find_for_user_and_media(user: &AuthUser, media_id: &str) -> Select<Entity> {
		Entity::find()
			.filter(Column::UserId.eq(&user.id))
			.filter(Column::MediaId.eq(media_id))
	}

	pub fn find_latest_for_user_and_media(
		user: &AuthUser,
		media_id: &str,
	) -> Select<Entity> {
		Entity::find_for_user_and_media(user, media_id)
			.order_by_desc(Column::CreatedAt)
			.limit(1)
	}
}

#[async_trait]
impl ActiveModelBehavior for ActiveModel {
	async fn before_save<C>(mut self, _db: &C, insert: bool) -> Result<Self, DbErr>
	where
		C: ConnectionTrait,
	{
		if insert {
			self.created_at = ActiveValue::Set(DateTimeWithTimeZone::from(Utc::now()));
		} else {
			self.updated_at =
				ActiveValue::Set(Some(DateTimeWithTimeZone::from(Utc::now())));
		}

		Ok(self)
	}
}
