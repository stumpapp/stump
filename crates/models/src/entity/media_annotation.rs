use async_graphql::SimpleObject;
use sea_orm::{entity::prelude::*, ActiveValue};

use crate::shared::readium::ReadiumLocator;

use super::{media, reading_session, user};

/// A media annotation represents a highlight and/or note
#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "MediaAnnotationModel")]
#[sea_orm(table_name = "media_annotations")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Json")]
	pub locator: ReadiumLocator,
	#[sea_orm(column_type = "Text", nullable)]
	pub annotation_text: Option<String>,
	#[sea_orm(column_type = "Text")]
	pub media_id: String,
	#[sea_orm(column_type = "Text")]
	pub user_id: String,
	pub created_at: DateTimeUtc,
	pub updated_at: DateTimeUtc,
	/// The ID of the session which this annotation was created in. Realistically, when using a Stump
	/// reader this should always be set
	pub session_id: Option<i32>,
	#[sea_orm(
		belongs_to,
		from = "media_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	#[graphql(skip)]
	pub media: BelongsTo<media::Entity>,
	#[sea_orm(
		belongs_to,
		from = "user_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	#[graphql(skip)]
	pub user: BelongsTo<user::Entity>,
	#[sea_orm(
		belongs_to,
		from = "session_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "SetNull"
	)]
	#[graphql(skip)]
	pub reading_session: BelongsTo<Option<reading_session::Entity>>,
}

impl Model {
	pub async fn find_for_user_and_media_id(
		user_id: &str,
		media_id: &str,
		db: &DatabaseConnection,
	) -> Result<Vec<Self>, DbErr> {
		Entity::find()
			.filter(Column::UserId.eq(user_id))
			.filter(Column::MediaId.eq(media_id))
			.all(db)
			.await
	}
}

#[async_trait::async_trait]
impl ActiveModelBehavior for ActiveModel {
	async fn before_save<C>(mut self, _db: &C, insert: bool) -> Result<Self, DbErr>
	where
		C: ConnectionTrait,
	{
		let now = chrono::Utc::now();

		if insert {
			if self.id.is_not_set() {
				self.id = ActiveValue::Set(uuid::Uuid::new_v4().to_string());
			}
			self.created_at = ActiveValue::Set(now);
		}

		self.updated_at = ActiveValue::Set(now);

		Ok(self)
	}
}
