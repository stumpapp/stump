use async_graphql::SimpleObject;
use sea_orm::{
	entity::prelude::*, prelude::async_trait::async_trait, ActiveValue, FromQueryResult,
	JoinType, QuerySelect,
};

use crate::prefixer::{parse_query_to_model, parse_query_to_model_optional, Prefixer};

use super::{registered_reading_device, user::AuthUser};

// TODO(sea-orm): Consider i32 for ID

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "ReadingSessionModel")]
#[sea_orm(table_name = "reading_sessions")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	pub page: Option<i32>,
	pub percentage_completed: Option<Decimal>,
	#[sea_orm(column_type = "Text", nullable)]
	pub epubcfi: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub koreader_progress: Option<String>,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub started_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub updated_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "Text")]
	pub media_id: String,
	#[sea_orm(column_type = "Text")]
	pub user_id: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub device_id: Option<String>,
	pub elapsed_seconds: Option<i64>,
}

pub struct ModelWithDevice {
	pub model: Model,
	pub device: Option<registered_reading_device::Model>,
}

impl ModelWithDevice {
	pub fn find() -> Select<Entity> {
		Prefixer::new(Entity::find().select_only())
			.add_columns(Entity)
			.add_columns(registered_reading_device::Entity)
			.selector
			.left_join(registered_reading_device::Entity)
	}
}

impl FromQueryResult for ModelWithDevice {
	fn from_query_result(
		res: &sea_orm::QueryResult,
		_pre: &str,
	) -> Result<Self, sea_orm::DbErr> {
		let model = parse_query_to_model::<Model, Entity>(res)?;
		let device = parse_query_to_model_optional::<
			registered_reading_device::Model,
			registered_reading_device::Entity,
		>(res)?;
		Ok(Self { model, device })
	}
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
		belongs_to = "super::registered_reading_device::Entity",
		from = "Column::DeviceId",
		to = "super::registered_reading_device::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	RegisteredReadingDevice,
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

impl Related<super::registered_reading_device::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::RegisteredReadingDevice.def()
	}
}

impl Related<super::user::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::User.def()
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

#[derive(FromQueryResult)]
pub struct OPDSV2ProgressionDevice {
	#[sea_orm(from_alias = "device_id")]
	id: String,
	name: String,
}

#[derive(FromQueryResult)]
pub struct OPDSV2Book {
	#[sea_orm(from_alias = "book_id")]
	id: String,
	extension: String,
	pages: i32,
	page_dimensions: Option<String>, // Convert after?
}

#[derive(FromQueryResult)]
pub struct OPDSV2Progression {
	page: Option<i32>,
	percentage_completed: Option<Decimal>,
	epubcfi: Option<String>,
	updated_at: String,
	#[sea_orm(nested)]
	device: OPDSV2ProgressionDevice,
	#[sea_orm(nested)]
	book: OPDSV2Book,
}

impl OPDSV2Progression {
	pub fn find() -> Select<Entity> {
		use super::{
			media, media_metadata, page_dimension, reading_session,
			registered_reading_device,
		};

		reading_session::Entity::find()
			.select_only()
			.columns(vec![
				reading_session::Column::Page,
				reading_session::Column::PercentageCompleted,
				reading_session::Column::Epubcfi,
				reading_session::Column::UpdatedAt,
			])
			.column_as(registered_reading_device::Column::Id, "device_id")
			.column_as(registered_reading_device::Column::Name, "device_id")
			.column_as(media::Column::Id, "book_id")
			.columns(vec![media::Column::Extension, media::Column::Pages])
			.column_as(page_dimension::Column::Dimensions, "page_dimensions")
			.left_join(registered_reading_device::Entity)
			.inner_join(media::Entity)
			.join_rev(
				JoinType::InnerJoin,
				media_metadata::Entity::belongs_to(media::Entity)
					.from(media_metadata::Column::MediaId)
					.to(media::Column::Id)
					.into(),
			)
			.join_rev(
				JoinType::LeftJoin,
				page_dimension::Entity::belongs_to(media_metadata::Entity)
					.from(page_dimension::Column::MetadataId)
					.to(media_metadata::Column::Id)
					.into(),
			)
	}
}

impl Entity {
	pub fn find_for_user_and_media_id(user: &AuthUser, media_id: &str) -> Select<Entity> {
		Entity::find()
			.filter(Column::UserId.eq(&user.id))
			.filter(Column::MediaId.eq(media_id))
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::tests::common::*;
	use pretty_assertions::assert_eq;

	fn get_default_user() -> AuthUser {
		AuthUser {
			id: "42".to_string(),
			username: "test".to_string(),
			is_server_owner: true,
			is_locked: false,
			permissions: vec![],
			age_restriction: None,
		}
	}

	#[test]
	fn test_find_for_user_and_media() {
		let user = get_default_user();
		let select = Entity::find_for_user_and_media_id(&user, "123");
		let stmt_str = select_no_cols_to_string(select);
		assert_eq!(
			stmt_str,
			r#"SELECT  FROM "reading_sessions" WHERE "reading_sessions"."user_id" = '42' AND "reading_sessions"."media_id" = '123'"#.to_string()
		);
	}
}
