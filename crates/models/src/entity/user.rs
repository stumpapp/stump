use async_graphql::SimpleObject;

use chrono::Utc;
use sea_orm::{
	entity::prelude::*, prelude::async_trait::async_trait, ActiveValue, FromQueryResult,
	QuerySelect,
};
use serde::{Deserialize, Serialize};

use crate::{
	prefixer::{parse_query_to_model, parse_query_to_model_optional, Prefixer},
	shared::{
		enums::UserPermission,
		image::{ImageMetadata, ImageRef},
		permission_set::PermissionSet,
	},
};

use super::{
	age_restriction, api_key, book_club_invitation, book_club_member, bookmark,
	emailer_send_record, last_library_visit, library_exclusion, media_annotation,
	reading_list, reading_session, review, session, smart_list, smart_list_access_rule,
	user_login_activity, user_preferences,
};

#[sea_orm::model]
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
	pub avatar_path: Option<String>,
	#[sea_orm(column_type = "Json", nullable)]
	pub avatar_meta: Option<ImageMetadata>,
	pub avatar_updated_at: Option<DateTimeWithTimeZone>,
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
	#[graphql(skip)]
	#[sea_orm(column_type = "Text", nullable, unique)]
	pub oidc_issuer_id: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub oidc_email: Option<String>,
	#[sea_orm(has_one)]
	#[graphql(skip)]
	pub age_restriction: HasOne<age_restriction::Entity>,
	#[sea_orm(has_many)]
	#[graphql(skip)]
	pub api_keys: HasMany<api_key::Entity>,
	#[sea_orm(has_many)]
	#[graphql(skip)]
	pub book_club_invitations: HasMany<book_club_invitation::Entity>,
	#[sea_orm(has_many)]
	#[graphql(skip)]
	pub book_club_members: HasMany<book_club_member::Entity>,
	#[sea_orm(has_many)]
	#[graphql(skip)]
	pub bookmarks: HasMany<bookmark::Entity>,
	#[sea_orm(has_many)]
	#[graphql(skip)]
	pub emailer_send_records: HasMany<emailer_send_record::Entity>,
	#[sea_orm(has_many, relation_enum = "HiddenLibrary")]
	#[graphql(skip)]
	pub hidden_libraries: HasMany<library_exclusion::Entity>,
	#[sea_orm(has_many)]
	#[graphql(skip)]
	pub last_library_visits: HasMany<last_library_visit::Entity>,
	#[sea_orm(has_many)]
	#[graphql(skip)]
	pub media_annotations: HasMany<media_annotation::Entity>,
	#[sea_orm(has_many)]
	#[graphql(skip)]
	pub reading_lists: HasMany<reading_list::Entity>,
	#[sea_orm(has_many)]
	#[graphql(skip)]
	pub reading_sessions: HasMany<reading_session::Entity>,
	#[sea_orm(has_many)]
	#[graphql(skip)]
	pub reviews: HasMany<review::Entity>,
	#[sea_orm(has_many)]
	#[graphql(skip)]
	pub sessions: HasMany<session::Entity>,
	#[sea_orm(has_many)]
	#[graphql(skip)]
	pub smart_list_access_rules: HasMany<smart_list_access_rule::Entity>,
	#[sea_orm(has_many)]
	#[graphql(skip)]
	pub smart_lists: HasMany<smart_list::Entity>,
	#[sea_orm(has_many)]
	#[graphql(skip)]
	pub login_activities: HasMany<user_login_activity::Entity>,
	#[sea_orm(
		belongs_to,
		from = "user_preferences_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	#[graphql(skip)]
	pub preferences: BelongsTo<Option<user_preferences::Entity>>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthUser {
	pub id: String,
	pub avatar_path: Option<String>,
	pub avatar: ImageRef,
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

	pub fn has_permission(&self, permission: UserPermission) -> bool {
		self.is_server_owner || self.permissions.contains(&permission)
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
		let avatar_path: Option<String> = res.try_get("", "avatar_path")?;
		let avatar_meta: Option<ImageMetadata> = res.try_get("", "avatar_meta")?;
		let avatar_updated_at: Option<DateTimeWithTimeZone> =
			res.try_get("", "avatar_updated_at")?;
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
				home_arrangement: Some(p.resolved_home_arrangement()),
				navigation_arrangement: p
					.navigation_arrangement
					.or_else(user_preferences::Model::default_navigation_arrangement),
				..p
			});

		let avatar = ImageRef {
			// Note: This will never get populated at the db-level, the API will
			// inject based on the service details
			url: String::default(),
			metadata: avatar_meta,
			last_modified: avatar_updated_at,
			..Default::default()
		};

		Ok(AuthUser {
			id,
			avatar_path,
			// Note: This will never get populated at the db-level, the API will
			// inject based on the service details
			// avatar_url: None,
			// avatar_meta,
			// avatar_updated_at,
			avatar,
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
	pub avatar_path: Option<String>,
	pub avatar_meta: Option<ImageMetadata>,
	pub avatar_updated_at: Option<DateTimeWithTimeZone>,
	pub username: String,
	pub hashed_password: String,
	pub is_server_owner: bool,
	pub is_locked: bool,
	pub max_sessions_allowed: Option<i32>,
	pub permissions: Vec<UserPermission>,
	pub age_restriction: Option<super::age_restriction::Model>,
	pub preferences: Option<user_preferences::Model>,
	pub oidc_issuer_id: Option<String>,
	pub oidc_email: Option<String>,
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
			avatar_path: user.avatar_path,
			avatar_meta: user.avatar_meta,
			avatar_updated_at: user.avatar_updated_at,
			username: user.username,
			hashed_password: user.hashed_password,
			is_server_owner: user.is_server_owner,
			is_locked: user.is_locked,
			max_sessions_allowed: user.max_sessions_allowed,
			permissions: PermissionSet::from(user.permissions.unwrap_or_default())
				.resolve_into_vec(),
			age_restriction,
			preferences,
			oidc_issuer_id: user.oidc_issuer_id,
			oidc_email: user.oidc_email,
		})
	}
}

impl From<LoginUser> for AuthUser {
	fn from(user: LoginUser) -> Self {
		AuthUser {
			id: user.id,
			avatar_path: user.avatar_path,
			// even if a user has no avatar, we still provide an empty ImageRef so that clients can still understand
			// where to fetch the avatar from. they will need to properly handle the not-found case and
			// what not but that feels acceptable for now. the alternative down the road could be to option `url`
			// but i hate that for things like media and other consumers of ImageRef
			avatar: ImageRef {
				// Note: This will never get populated at the db-level, the API will
				// inject based on the service details
				url: String::default(),
				metadata: user.avatar_meta,
				last_modified: user.avatar_updated_at,
				..Default::default()
			},
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
