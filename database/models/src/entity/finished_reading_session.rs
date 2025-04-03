use super::{media, user::AuthUser};
use async_graphql::SimpleObject;
use sea_orm::{
	entity::prelude::*, prelude::async_trait::async_trait, ActiveValue, QuerySelect,
};

// TODO(sea-orm): Consider i32 for ID

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "FinishedReadingSessionModel")]
#[sea_orm(table_name = "finished_reading_sessions")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
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
