use async_graphql::SimpleObject;

use chrono::Utc;
use sea_orm::{
	entity::prelude::*, prelude::async_trait::async_trait, ActiveValue, FromQueryResult,
	QuerySelect,
};
use serde::{Deserialize, Serialize};

use crate::{
	prefixer::{parse_query_to_model, parse_query_to_model_optional, Prefixer},
	shared::{enums::UserPermission, permission_set::PermissionSet},
};

use super::{age_restriction, user_preferences};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "UserModel")]
#[sea_orm(table_name = "users")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text", unique)]
	pub username: String,
	#[sea_orm(column_type = "Text")]
	#[graphql(skip)]
	pub hashed_password: String,
	pub is_server_owner: bool,
	#[sea_orm(column_type = "Text", nullable)]
	pub avatar_url: Option<String>,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub created_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub deleted_at: Option<DateTimeWithTimeZone>,
	pub is_locked: bool,
	pub max_sessions_allowed: Option<i32>,
	#[graphql(skip)]
	#[sea_orm(column_type = "Text", nullable)]
	pub permissions: Option<String>,
	#[graphql(skip)]
	#[sea_orm(nullable, unique)]
	pub user_preferences_id: Option<i32>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthUser {
	pub id: String,
	pub avatar_url: Option<String>,
	pub username: String,
	pub is_server_owner: bool,
	pub is_locked: bool,
	pub permissions: Vec<UserPermission>,
	pub age_restriction: Option<super::age_restriction::Model>,
	pub preferences: Option<user_preferences::Model>,
}

impl AuthUser {
	pub fn is(&self, user: &AuthUser) -> bool {
		self.id == user.id
	}
}

impl FromQueryResult for AuthUser {
	fn from_query_result(
		res: &sea_orm::QueryResult,
		_pre: &str,
	) -> Result<Self, sea_orm::DbErr> {
		let id = res.try_get("", "id")?;
		let username = res.try_get("", "username")?;
		let is_server_owner = res.try_get("", "is_server_owner")?;
		let is_locked = res.try_get("", "is_locked")?;
		let permissions_str: String = res.try_get("", "permissions")?;
		let permissions = PermissionSet::from(permissions_str).resolve_into_vec();
		let avatar_url: Option<String> = res.try_get("", "avatar_url")?;
		let age_restriction = match age_restriction::Model::from_query_result(res, "") {
			Ok(age_restriction) => Some(age_restriction),
			Err(sea_orm::DbErr::RecordNotFound(_)) => None,
			Err(err) => return Err(err),
		};
		let preferences = user_preferences::Model::from_query_result_optional(res, "")
			.unwrap_or_else(|error| {
				tracing::error!(?error, "Failed to parse user preferences");
				None
			})
			.map(|p| user_preferences::Model {
				home_arrangement: p
					.home_arrangement
					.or_else(user_preferences::Model::default_home_arrangement),
				navigation_arrangement: p
					.navigation_arrangement
					.or_else(user_preferences::Model::default_navigation_arrangement),
				..p
			});

		Ok(AuthUser {
			id,
			avatar_url,
			username,
			is_server_owner,
			is_locked,
			permissions,
			age_restriction,
			preferences,
		})
	}
}

#[derive(Clone)]
pub struct LoginUser {
	pub id: String,
	pub avatar_url: Option<String>,
	pub username: String,
	pub hashed_password: String,
	pub is_server_owner: bool,
	pub is_locked: bool,
	pub max_sessions_allowed: Option<i32>,
	pub permissions: Vec<UserPermission>,
	pub age_restriction: Option<super::age_restriction::Model>,
	pub preferences: Option<user_preferences::Model>,
}

impl LoginUser {
	pub fn find() -> Select<Entity> {
		Prefixer::new(Entity::find().select_only())
			.add_columns(Entity)
			.add_columns(age_restriction::Entity)
			.add_columns(user_preferences::Entity)
			.selector
			.left_join(age_restriction::Entity)
			.left_join(user_preferences::Entity)
	}

	pub fn find_by_id(id: String) -> Select<Entity> {
		Prefixer::new(Entity::find().filter(Column::Id.eq(id)).select_only())
			.add_columns(Entity)
			.add_columns(age_restriction::Entity)
			.add_columns(user_preferences::Entity)
			.selector
			.left_join(age_restriction::Entity)
			.left_join(user_preferences::Entity)
	}
}

impl FromQueryResult for LoginUser {
	fn from_query_result(
		res: &sea_orm::QueryResult,
		_pre: &str,
	) -> Result<Self, sea_orm::DbErr> {
		let user = parse_query_to_model::<Model, Entity>(res)?;
		let age_restriction = parse_query_to_model_optional::<
			age_restriction::Model,
			age_restriction::Entity,
		>(res)?;
		let preferences = parse_query_to_model_optional::<
			user_preferences::Model,
			user_preferences::Entity,
		>(res)?;

		Ok(LoginUser {
			id: user.id,
			avatar_url: user.avatar_url,
			username: user.username,
			hashed_password: user.hashed_password,
			is_server_owner: user.is_server_owner,
			is_locked: user.is_locked,
			max_sessions_allowed: user.max_sessions_allowed,
			permissions: PermissionSet::from(user.permissions.unwrap_or_default())
				.resolve_into_vec(),
			age_restriction,
			preferences,
		})
	}
}

impl From<LoginUser> for AuthUser {
	fn from(user: LoginUser) -> Self {
		AuthUser {
			id: user.id,
			avatar_url: user.avatar_url,
			username: user.username,
			is_server_owner: user.is_server_owner,
			is_locked: user.is_locked,
			permissions: user.permissions,
			age_restriction: user.age_restriction,
			preferences: user.preferences,
		}
	}
}

#[derive(Debug, FromQueryResult)]
pub struct UserIdentSelect {
	pub id: String,
	pub username: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(has_one = "super::age_restriction::Entity")]
	AgeRestriction,
	#[sea_orm(has_many = "super::api_key::Entity")]
	ApiKey,
	#[sea_orm(has_many = "super::book_club_invitation::Entity")]
	BookClubInvitation,
	#[sea_orm(has_many = "super::book_club_member::Entity")]
	BookClubMember,
	#[sea_orm(has_many = "super::bookmark::Entity")]
	Bookmark,
	#[sea_orm(has_many = "super::emailer_send_record::Entity")]
	EmailerSendRecord,
	#[sea_orm(has_many = "super::finished_reading_session::Entity")]
	FinishedReadingSession,
	#[sea_orm(has_many = "super::library_exclusion::Entity")]
	HiddenLibrary,
	#[sea_orm(has_many = "super::last_library_visit::Entity")]
	LastLibraryVisit,
	#[sea_orm(has_many = "super::media_annotation::Entity")]
	MediaAnnotation,
	#[sea_orm(has_many = "super::reading_list::Entity")]
	ReadingList,
	#[sea_orm(has_many = "super::reading_session::Entity")]
	ReadingSession,
	#[sea_orm(has_many = "super::review::Entity")]
	Review,
	#[sea_orm(has_many = "super::session::Entity")]
	Session,
	#[sea_orm(has_many = "super::smart_list_access_rule::Entity")]
	SmartListAccessRule,
	#[sea_orm(has_many = "super::smart_list::Entity")]
	SmartList,
	#[sea_orm(has_many = "super::user_login_activity::Entity")]
	UserLoginActivity,
	#[sea_orm(
		belongs_to = "super::user_preferences::Entity",
		from = "Column::UserPreferencesId",
		to = "super::user_preferences::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	UserPreferences,
}

impl Related<super::age_restriction::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::AgeRestriction.def()
	}
}

impl Related<super::api_key::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::ApiKey.def()
	}
}

impl Related<super::book_club_invitation::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubInvitation.def()
	}
}

impl Related<super::book_club_member::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubMember.def()
	}
}

impl Related<super::bookmark::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Bookmark.def()
	}
}

impl Related<super::emailer_send_record::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::EmailerSendRecord.def()
	}
}

impl Related<super::finished_reading_session::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::FinishedReadingSession.def()
	}
}

impl Related<super::library_exclusion::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::HiddenLibrary.def()
	}
}

impl Related<super::last_library_visit::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::LastLibraryVisit.def()
	}
}

impl Related<super::media_annotation::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::MediaAnnotation.def()
	}
}

impl Related<super::reading_list::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::ReadingList.def()
	}
}

impl Related<super::reading_session::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::ReadingSession.def()
	}
}

impl Related<super::review::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Review.def()
	}
}

impl Related<super::session::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Session.def()
	}
}

impl Related<super::smart_list_access_rule::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::SmartListAccessRule.def()
	}
}

impl Related<super::smart_list::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::SmartList.def()
	}
}

impl Related<super::user_login_activity::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::UserLoginActivity.def()
	}
}

impl Related<super::user_preferences::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::UserPreferences.def()
	}
}

#[async_trait]
impl ActiveModelBehavior for ActiveModel {
	async fn before_save<C>(mut self, _db: &C, insert: bool) -> Result<Self, DbErr>
	where
		C: ConnectionTrait,
	{
		if insert {
			if self.id.is_not_set() {
				self.id = ActiveValue::Set(Uuid::new_v4().to_string());
			}
			self.created_at = ActiveValue::Set(DateTimeWithTimeZone::from(Utc::now()));
			self.is_locked = ActiveValue::Set(false);
		}

		Ok(self)
	}
}
