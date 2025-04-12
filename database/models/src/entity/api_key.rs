use sea_orm::{entity::prelude::*, FromQueryResult, JoinType, QuerySelect};

use crate::prefixer::{parse_query_to_model, Prefixer};

use super::{age_restriction, user};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "api_keys")]
pub struct Model {
	#[sea_orm(primary_key)]
	pub id: i32,
	#[sea_orm(column_type = "Text")]
	pub name: String,
	#[sea_orm(column_type = "Text")]
	pub short_token: String,
	#[sea_orm(column_type = "Text")]
	pub long_token_hash: String,
	#[sea_orm(column_type = "Blob")]
	pub permissions: Vec<u8>,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub created_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub last_used_at: Option<DateTimeWithTimeZone>,
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub expires_at: Option<DateTimeWithTimeZone>,
	#[sea_orm(column_type = "Text")]
	pub user_id: String,
}

pub struct APIKeyWithUser {
	pub api_key: Model,
	pub user: user::LoginUser,
}

impl APIKeyWithUser {
	pub fn find() -> Select<Entity> {
		Prefixer::new(Entity::find().select_only())
			.add_columns(Entity)
			.add_columns(user::Entity)
			.add_columns(age_restriction::Entity)
			.selector
			.inner_join(user::Entity)
			.filter(user::Column::DeletedAt.is_null())
			.join_rev(
				JoinType::LeftJoin,
				age_restriction::Entity::belongs_to(user::Entity)
					.from(age_restriction::Column::UserId)
					.to(user::Column::Id)
					.into(),
			)
	}
}

impl FromQueryResult for APIKeyWithUser {
	fn from_query_result(
		res: &sea_orm::QueryResult,
		_pre: &str,
	) -> Result<Self, sea_orm::DbErr> {
		let model = parse_query_to_model::<Model, Entity>(res)?;
		let user = user::LoginUser::from_query_result(res, "")?;

		Ok(APIKeyWithUser {
			api_key: model,
			user,
		})
	}
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(
		belongs_to = "super::user::Entity",
		from = "Column::UserId",
		to = "super::user::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	User,
}

impl Related<super::user::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::User.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}
