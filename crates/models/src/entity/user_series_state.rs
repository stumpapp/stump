use async_graphql::SimpleObject;
use chrono::Utc;
use sea_orm::{prelude::*, ActiveValue, DeriveEntityModel};

// TODO: i think i am thinking of this correctly, but i think maybe i need
// to think more about it to ensure my thoughts are properly thunked. im tired lol
// example:
// - i have a series of 4 books (1 unreleased, not on server)
// - i read 3 books and then drop the series
// - this will cause on deck to be empty
// - the 5th comes in
// - 5th shows up in on deck
// if i track the readthrough at which it was dropped, then i can continue
// to show the next book in the series instead of skipping to the 5th. is that
// needed???? i'll keep it for now

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

	/// the readthrough number at which this series was dropped, so that we can
	/// revert back to "first book beyond highest position ever read" logic for
	/// the recommendations query instead of "next book in current re-read"
	pub stopped_readthrough: Option<i32>,

	/// when set, the books in the series will be excluded from on-deck recommentations
	///  if the timestamp is after the ingestion time into stump
	pub dropped_at: Option<DateTimeWithTimeZone>,

	pub created_at: DateTimeWithTimeZone,
	pub updated_at: Option<DateTimeWithTimeZone>,
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
		let now = DateTimeWithTimeZone::from(Utc::now());

		if insert {
			self.created_at = ActiveValue::Set(now.clone());
		}

		self.updated_at = ActiveValue::Set(Some(now));

		Ok(self)
	}
}
