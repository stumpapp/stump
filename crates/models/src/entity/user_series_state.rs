use async_graphql::SimpleObject;
use chrono::{DateTime, Utc};
use sea_orm::{prelude::*, ActiveValue, DeriveEntityModel};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "UserSeriesState")]
#[sea_orm(table_name = "user_series_state")]
pub struct Model {
	#[graphql(skip)]
	#[sea_orm(primary_key, auto_increment = true)]
	pub id: i32,

	#[graphql(skip)]
	#[sea_orm(column_type = "Text")]
	pub user_id: String,
	#[sea_orm(column_type = "Text")]
	pub series_id: String,

	/// the date at which the last reread was stopped, so that we can
	/// revert back to "first book beyond highest position ever read" logic for
	/// the recommendations query instead of "next book in current re-read"
	pub reread_stopped_at: Option<DateTime<Utc>>,

	/// the date at which the series reading was "backlogged" for the user, which
	/// would exclude books from this series showing up in on-deck recommentations
	pub backlogged_at: Option<DateTime<Utc>>,

	/// the date at which the series was dnf'ed, which functionally is the same
	/// as "backlogged" but with the added semantics of "I will never read this again"
	/// and all that
	pub dnf_at: Option<DateTime<Utc>>,

	pub created_at: DateTime<Utc>,
	pub updated_at: Option<DateTime<Utc>>,
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

	#[sea_orm(
		belongs_to = "super::series::Entity",
		from = "Column::SeriesId",
		to = "super::series::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	Series,
}

impl Related<super::user::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::User.def()
	}
}

impl Related<super::series::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Series.def()
	}
}

#[async_trait::async_trait]
impl ActiveModelBehavior for ActiveModel {
	async fn before_save<C>(mut self, _db: &C, insert: bool) -> Result<Self, DbErr>
	where
		C: ConnectionTrait,
	{
		let now = Utc::now();

		if insert {
			self.created_at = ActiveValue::Set(now);
		}

		self.updated_at = ActiveValue::Set(Some(now));

		Ok(self)
	}
}
