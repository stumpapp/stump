use async_graphql::SimpleObject;
use sea_orm::{prelude::*, QueryOrder};

use super::book_club_schedule;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "BookClubBookModel")]
#[sea_orm(table_name = "book_club_books")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub start_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub end_at: DateTimeWithTimeZone,
	pub discussion_duration_days: Option<i32>,
	#[sea_orm(column_type = "Text", nullable)]
	pub title: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub author: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub url: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub image_url: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub book_entity_id: Option<String>,
	pub book_club_schedule_id: Option<i32>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(has_one = "super::book_club_discussion::Entity")]
	BookClubDiscussion,
	#[sea_orm(
		belongs_to = "super::book_club_schedule::Entity",
		from = "Column::BookClubScheduleId",
		to = "super::book_club_schedule::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	BookClubSchedule,
	#[sea_orm(
		belongs_to = "super::media::Entity",
		from = "Column::BookEntityId",
		to = "super::media::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	Media,
}

impl Related<super::book_club_discussion::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubDiscussion.def()
	}
}

impl Related<super::book_club_schedule::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubSchedule.def()
	}
}

impl Related<super::media::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Media.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}

impl Entity {
	pub fn find_with_schedule_for_book_club_id(
		book_club_id: &str,
		date: chrono::DateTime<chrono::Utc>,
	) -> Select<Entity> {
		Entity::find()
			.inner_join(book_club_schedule::Entity)
			.filter(book_club_schedule::Column::BookClubId.eq(book_club_id))
			.filter(Column::EndAt.gte(date))
			.order_by_asc(Column::StartAt)
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::tests::common::*;
	use chrono::NaiveDate;
	use pretty_assertions::assert_eq;

	#[test]
	fn test_find_with_schedule() {
		let book_club_id = "314";
		let dt = NaiveDate::from_ymd_opt(2014, 7, 8)
			.unwrap()
			.and_hms_milli_opt(9, 10, 11, 12)
			.unwrap()
			.and_utc();
		let select = Entity::find_with_schedule_for_book_club_id(book_club_id, dt);
		assert_eq!(
			select_no_cols_to_string(select),
			r#"SELECT  FROM "book_club_books" INNER JOIN "book_club_schedules" ON "book_club_books"."book_club_schedule_id" = "book_club_schedules"."id" WHERE "book_club_schedules"."book_club_id" = '314' AND "book_club_books"."end_at" >= '2014-07-08 09:10:11.012000 +00:00' ORDER BY "book_club_books"."start_at" ASC"#
		);
	}
}
