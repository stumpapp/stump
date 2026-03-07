use async_graphql::SimpleObject;
use sea_orm::{
	prelude::{async_trait::async_trait, *},
	ActiveValue, QueryOrder, QuerySelect,
};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "BookClubBookModel")]
#[sea_orm(table_name = "book_club_books")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	pub position: i32,
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub completed_at: Option<DateTimeWithTimeZone>,
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
	#[sea_orm(column_type = "Text")]
	pub book_club_id: String,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub added_at: DateTimeWithTimeZone,
}

impl Model {
	/// This is used to remove the book_entity_id in the scenario where a user
	/// shouldn't have access to the book (e.g., access rules, etc). This is a really
	/// awkward way to handle this honestly, but it avoids having to build out a super
	/// complex flow for adding books that checks EACH member's access to the book
	pub fn sanitize_entity(&mut self) {
		let entity_id = self.book_entity_id.take();
		tracing::debug!(
			?entity_id,
			"Sanitizing book club book by removing entity ID"
		);
	}
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(
		belongs_to = "super::book_club::Entity",
		from = "Column::BookClubId",
		to = "super::book_club::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	BookClub,
	#[sea_orm(has_one = "super::book_club_discussion::Entity")]
	BookClubDiscussion,
	#[sea_orm(
		belongs_to = "super::media::Entity",
		from = "Column::BookEntityId",
		to = "super::media::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	Media,
}

impl Related<super::book_club::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClub.def()
	}
}

impl Related<super::book_club_discussion::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubDiscussion.def()
	}
}

impl Related<super::media::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Media.def()
	}
}

#[async_trait]
impl ActiveModelBehavior for ActiveModel {
	async fn before_save<C>(mut self, _db: &C, insert: bool) -> Result<Self, DbErr>
	where
		C: ConnectionTrait,
	{
		if insert {
			self.added_at = ActiveValue::Set(chrono::Utc::now().into());
		}
		Ok(self)
	}
}

impl Entity {
	/// Find all books for a book club, ordered by position
	pub fn find_for_book_club_id(book_club_id: &str) -> Select<Entity> {
		Entity::find()
			.filter(Column::BookClubId.eq(book_club_id))
			.order_by_asc(Column::Position)
	}

	/// Find the current (uncompleted) book with the lowest position
	pub fn find_current_for_book_club_id(book_club_id: &str) -> Select<Entity> {
		Entity::find()
			.filter(Column::BookClubId.eq(book_club_id))
			.filter(Column::CompletedAt.is_null())
			.order_by_asc(Column::Position)
	}

	/// Get the next available position for a new book in a club (max position + 1)
	pub async fn get_max_position_for_club<C: ConnectionTrait>(
		book_club_id: &str,
		conn: &C,
	) -> Result<i32, DbErr> {
		let result: Option<(Option<i32>,)> = Entity::find()
			.filter(Column::BookClubId.eq(book_club_id))
			.select_only()
			.column_as(Column::Position.max(), "max_pos")
			.into_tuple()
			.one(conn)
			.await?;

		Ok(result.and_then(|(max,)| max).map_or(0, |p| p + 1))
	}

	/// Get the effective "current" book position for filtering previous discussions.
	///
	/// Returns:
	/// - `Some(position)` of the current (uncompleted) book if one exists
	/// - `Some(max_position + 1)` if all books are completed (so `position < value` matches all books)
	/// - `None` if no books exist at all
	pub async fn get_current_or_next_position<C: ConnectionTrait>(
		book_club_id: &str,
		conn: &C,
	) -> Result<Option<i32>, DbErr> {
		let current_book = Entity::find_current_for_book_club_id(book_club_id)
			.one(conn)
			.await?;

		if let Some(book) = current_book {
			return Ok(Some(book.position));
		}

		let max_position = Self::get_max_position_for_club(book_club_id, conn).await?;
		if max_position == 0 {
			let has_books = Entity::find()
				.filter(Column::BookClubId.eq(book_club_id))
				.count(conn)
				.await?;
			if has_books == 0 {
				return Ok(None);
			}
		}

		Ok(Some(max_position))
	}

	/// Get the next position after all completed books in a club
	pub async fn get_next_position_after_completed<C: ConnectionTrait>(
		book_club_id: &str,
		conn: &C,
	) -> Result<i32, DbErr> {
		let result: Option<(Option<i32>,)> = Entity::find()
			.filter(Column::BookClubId.eq(book_club_id))
			.filter(Column::CompletedAt.is_not_null())
			.select_only()
			.column_as(Column::Position.max(), "max_pos")
			.into_tuple()
			.one(conn)
			.await?;

		Ok(result.and_then(|(max,)| max).map_or(0, |p| p + 1))
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::tests::common::*;
	use pretty_assertions::assert_eq;

	#[test]
	fn test_find_for_book_club_id() {
		let select = Entity::find_for_book_club_id("314");
		assert_eq!(
			select_no_cols_to_string(select),
			r#"SELECT  FROM "book_club_books" WHERE "book_club_books"."book_club_id" = '314' ORDER BY "book_club_books"."position" ASC"#
		);
	}

	#[test]
	fn test_find_current_for_book_club_id() {
		let select = Entity::find_current_for_book_club_id("314");
		assert_eq!(
			select_no_cols_to_string(select),
			r#"SELECT  FROM "book_club_books" WHERE "book_club_books"."book_club_id" = '314' AND "book_club_books"."completed_at" IS NULL ORDER BY "book_club_books"."position" ASC"#
		);
	}
}
