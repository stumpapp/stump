

use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "users")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text", unique)]
	pub username: String,
	#[sea_orm(column_type = "Text")]
	pub hashed_password: String,
	pub is_server_owner: bool,
	#[sea_orm(column_type = "Text", nullable)]
	pub avatar_url: Option<String>,
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub last_login: Option<String>,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub created_at: String,
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub deleted_at: Option<String>,
	pub is_locked: bool,
	pub max_sessions_allowed: Option<i32>,
	#[sea_orm(column_type = "Text", nullable)]
	pub permissions: Option<String>,
	#[sea_orm(column_type = "Text", nullable, unique)]
	pub user_preferences_id: Option<String>,
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
