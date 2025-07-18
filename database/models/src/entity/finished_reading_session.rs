use crate::prefixer::{parse_query_to_model, parse_query_to_model_optional, Prefixer};

use super::{media, registered_reading_device, user::AuthUser};
use async_graphql::SimpleObject;
use sea_orm::{entity::prelude::*, FromQueryResult, QuerySelect};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "FinishedReadingSessionModel")]
#[sea_orm(table_name = "finished_reading_sessions")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = true)]
	pub id: i32,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub started_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub completed_at: DateTimeWithTimeZone,
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

impl ActiveModelBehavior for ActiveModel {}

impl Entity {
	pub fn find_finished_in_series(user: &AuthUser, series_id: String) -> Select<Self> {
		Self::find()
			.inner_join(media::Entity)
			.filter(media::Column::SeriesId.eq(series_id))
			.filter(Column::UserId.eq(user.id.clone()))
			.distinct_on([Column::MediaId])
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::tests::common::*;
	use pretty_assertions::assert_eq;

	#[test]
	fn test_find_finished_in_series() {
		let user = get_default_user();
		let select = Entity::find_finished_in_series(&user, "123".to_string());
		let stmt_str = select_no_cols_to_string(select);
		assert_eq!(
			stmt_str,
			r#"SELECT   FROM "finished_reading_sessions" INNER JOIN "media" ON "finished_reading_sessions"."media_id" = "media"."id" WHERE "media"."series_id" = '123' AND "finished_reading_sessions"."user_id" = '42'"#.to_string()
		);
	}
}
