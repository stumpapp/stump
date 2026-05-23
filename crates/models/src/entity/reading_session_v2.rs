use async_graphql::SimpleObject;
use chrono::Utc;
use sea_orm::{
	entity::prelude::*, prelude::async_trait::async_trait, ActiveValue, Condition,
	DeriveEntityModel, FromJsonQueryResult, FromQueryResult, JoinType, QueryOrder,
	QuerySelect,
};
use serde::{Deserialize, Serialize};

use crate::{
	entity::reading_device,
	prefixer::{parse_query_to_model, parse_query_to_model_optional, Prefixer},
	shared::{enums::ReadingStatus, readium::ReadiumLocator},
};

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

	/// the status of this session. this might feel confusing when considering that sessions will
	/// remain in place even after completion/dnf, but the idea is that the status represents the
	/// state of the session when it was last updated
	#[sea_orm(column_type = "Text")]
	pub status: ReadingStatus,

	// TODO(v2-sessions): either keep this here or make notes a separate table?
	// need to figure out ui flow for adding notes, a bit convoluted if e.g. you hvae
	// multiple sessions in a day and go to add a note
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

impl Model {
	/// whether this session is "finalized"
	pub fn is_finalized(&self) -> bool {
		matches!(
			self.status,
			ReadingStatus::Finished | ReadingStatus::Abandoned
		)
	}

	/// whether this session represents a completed readthrough (i.e. status = Finished)
	pub fn is_complete(&self) -> bool {
		self.status == ReadingStatus::Finished
	}
}

// TODO(v2-sessions): this is terrible lol it will be a little bit of a headache to make this plural,
// so for now just extract the first id in the ids list. i also don't know if some of the integrations
// which this is meant to support (e.g. koreader) care about multiple devices. maybe i just add e.g.
// find_with_kind("koreader") or something
pub struct ModelWithDevice {
	pub model: Model,
	pub device: Option<reading_device::Model>,
}

impl ModelWithDevice {
	pub fn find() -> Select<Entity> {
		Prefixer::new(Entity::find().select_only())
			.add_columns(Entity)
			.add_columns(reading_device::Entity)
			.selector
			.join_rev(
				JoinType::LeftJoin,
				Entity::belongs_to(reading_device::Entity)
					.from(Column::DeviceIds)
					.to(reading_device::Column::Id)
					// https://sqlite.org/json1.html#the_json_extract_function
					.on_condition(|_left, _right| {
						Condition::all().add(Expr::cust(
							"json_extract(reading_sessions_v2.device_ids, '$[0]') = reading_device.id",
						))
					})
					.into(),
			)
	}
}

impl FromQueryResult for ModelWithDevice {
	fn from_query_result(
		res: &sea_orm::QueryResult,
		_pre: &str,
	) -> Result<Self, sea_orm::DbErr> {
		let model = parse_query_to_model::<Model, Entity>(res)?;
		let device = parse_query_to_model_optional::<
			reading_device::Model,
			reading_device::Entity,
		>(res)?;
		Ok(Self { model, device })
	}
}

// note: because DeviceIds is a JSON col we can't derive the relation, to do that we'd
// need a junction table instead, but i don't wanna deal with that rn so it's fine
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
		let now = Utc::now();
		if insert {
			self.created_at = ActiveValue::Set(DateTimeWithTimeZone::from(now));
			self.status = match self.status {
				ActiveValue::Set(s) => ActiveValue::Set(s),
				_ => ActiveValue::Set(ReadingStatus::Reading),
			};
		}
		self.updated_at = ActiveValue::Set(Some(DateTimeWithTimeZone::from(now)));

		Ok(self)
	}
}
