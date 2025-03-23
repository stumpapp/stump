use async_graphql::SimpleObject;

use sea_orm::{entity::prelude::*, FromQueryResult};

use crate::shared::{enums::UserPermission, permission_set::PermissionSet};

use super::age_restriction;

// TODO: skip fields which most users shouldn't see
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
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub last_login: Option<DateTimeWithTimeZone>,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub created_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub deleted_at: Option<DateTimeWithTimeZone>,
	pub is_locked: bool,
	pub max_sessions_allowed: Option<i32>,
	#[sea_orm(column_type = "Text", nullable)]
	pub permissions: Option<String>,
	#[sea_orm(column_type = "Text", nullable, unique)]
	pub user_preferences_id: Option<String>,
}

// TODO: change name?
#[derive(Clone)]
pub struct AuthUser {
	pub id: String,
	pub username: String,
	pub is_server_owner: bool,
	pub is_locked: bool,
	pub permissions: Vec<UserPermission>,
	pub age_restriction: Option<super::age_restriction::Model>,
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
		let age_restriction = match age_restriction::Model::from_query_result(res, "") {
			Ok(age_restriction) => Some(age_restriction),
			Err(sea_orm::DbErr::RecordNotFound(_)) => None,
			Err(err) => return Err(err),
		};

		Ok(AuthUser {
			id,
			username,
			is_server_owner,
			is_locked,
			permissions,
			age_restriction,
		})
	}
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
	#[sea_orm(has_many = "super::library_hidden_to_user::Entity")]
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
		belongs_to = "super::user_preference::Entity",
		from = "Column::UserPreferencesId",
		to = "super::user_preference::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	UserPreference,
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

impl Related<super::library_hidden_to_user::Entity> for Entity {
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

impl Related<super::user_preference::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::UserPreference.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}
