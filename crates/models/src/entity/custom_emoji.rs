use async_graphql::SimpleObject;
use sea_orm::{entity::prelude::*, prelude::async_trait::async_trait, ActiveValue};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "CustomEmojiModel")]
#[sea_orm(table_name = "custom_emojis")]
pub struct Model {
	#[sea_orm(primary_key)]
	pub id: i32,
	#[sea_orm(column_type = "Text")]
	pub name: String,
	pub is_animated: bool,
	#[sea_orm(column_type = "Text")]
	pub file_extension: String,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub created_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "Text")]
	pub created_by_id: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(
		belongs_to = "super::user::Entity",
		from = "Column::CreatedById",
		to = "super::user::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	User,
	#[sea_orm(has_many = "super::book_club_discussion_message_reaction::Entity")]
	Reactions,
}

impl Related<super::user::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::User.def()
	}
}

impl Related<super::book_club_discussion_message_reaction::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Reactions.def()
	}
}

#[async_trait]
impl ActiveModelBehavior for ActiveModel {
	async fn before_save<C>(mut self, _db: &C, insert: bool) -> Result<Self, DbErr>
	where
		C: ConnectionTrait,
	{
		if insert {
			self.created_at = ActiveValue::Set(chrono::Utc::now().into());
		}
		Ok(self)
	}
}
