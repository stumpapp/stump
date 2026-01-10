use crate::{
	entity::{book_club, book_club_member},
	shared::book_club::{BookClubMemberRole, BookClubMemberRoleSpec},
};
use async_graphql::SimpleObject;
use chrono::Utc;
use sea_orm::{
	entity::prelude::*,
	prelude::async_trait::async_trait,
	sea_query::{Query, SelectStatement},
	ActiveValue::Set,
	Condition,
};
use slugify::slugify;

use super::user::AuthUser;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "BookClubModel")]
#[sea_orm(table_name = "book_clubs")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text")]
	pub name: String,
	#[sea_orm(column_type = "Text", unique)]
	pub slug: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub description: Option<String>,
	pub is_private: bool,
	#[graphql(skip)]
	#[sea_orm(column_type = "Json", nullable)]
	pub member_role_spec: Option<BookClubMemberRoleSpec>,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub created_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "Text", nullable)]
	pub emoji: Option<String>,
}

impl Entity {
	fn filter_for_user(user: &AuthUser) -> Condition {
		Condition::all().add_option(
			// Server owner can see all book clubs
			if user.is_server_owner {
				None
			} else {
				// Any other user can see a book club if they are a member OR if it is not private
				Some(
					Condition::any().add(Column::IsPrivate.eq(false)).add(
						Column::Id.in_subquery(
							Query::select()
								.column(book_club_member::Column::BookClubId)
								.from(book_club_member::Entity)
								.and_where(book_club_member::Column::UserId.eq(&user.id))
								.to_owned(),
						),
					),
				)
			},
		)
	}

	fn filter_for_member_user(user: &AuthUser) -> Condition {
		Condition::all()
			.add(book_club::Column::Id.in_subquery(Self::subquery_for_user(user)))
	}

	fn subquery_for_user(user: &AuthUser) -> SelectStatement {
		Query::select()
			.column(book_club_member::Column::BookClubId)
			.from(book_club_member::Entity)
			.and_where(book_club_member::Column::UserId.eq(user.id.clone()))
			.to_owned()
	}

	pub fn find_by_id_and_user(id: &str, user: &AuthUser) -> Select<Entity> {
		Entity::find()
			.filter(Self::filter_for_user(user))
			.filter(book_club::Column::Id.eq(id))
	}

	pub fn find_by_slug_and_user(slug: &str, user: &AuthUser) -> Select<Entity> {
		Entity::find()
			.filter(Self::filter_for_user(user))
			.filter(book_club::Column::Slug.eq(slug))
	}

	pub fn find_all_for_user(all: bool, user: &AuthUser) -> Select<Entity> {
		let condition = if all {
			Self::filter_for_user(user)
		} else {
			Self::filter_for_member_user(user)
		};
		Entity::find().filter(condition)
	}

	/// Find all book clubs that the user can access
	pub fn find_for_user(user: &AuthUser) -> Select<Entity> {
		Entity::find().filter(Self::filter_for_user(user))
	}

	/// Find all book clubs that the user is a member of
	pub fn find_for_member_user(user: &AuthUser) -> Select<Entity> {
		Entity::find().filter(Self::filter_for_member_user(user))
	}

	pub fn find_for_member_enforce_role(
		user: &AuthUser,
		role: BookClubMemberRole,
	) -> Select<Entity> {
		let condition = Condition::all().add_option(if user.is_server_owner {
			None
		} else {
			Some(
				book_club::Column::Id.in_subquery(
					Self::subquery_for_user(user)
						.and_where(book_club_member::Column::Role.gte::<i32>(role as i32))
						.to_owned(),
				),
			)
		});

		Entity::find().filter(condition)
	}

	pub fn find_for_member_enforce_role_and_id(
		user: &AuthUser,
		role: BookClubMemberRole,
		id: &str,
	) -> Select<Entity> {
		Self::find_for_member_enforce_role(user, role).filter(Column::Id.eq(id))
	}
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(has_many = "super::book_club_invitation::Entity")]
	BookClubInvitation,
	#[sea_orm(has_many = "super::book_club_member::Entity")]
	BookClubMember,
	#[sea_orm(has_one = "super::book_club_schedule::Entity")]
	BookClubSchedule,
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

impl Related<super::book_club_schedule::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubSchedule.def()
	}
}

#[async_trait]
impl ActiveModelBehavior for ActiveModel {
	async fn before_save<C>(mut self, _db: &C, insert: bool) -> Result<Self, DbErr>
	where
		C: ConnectionTrait,
	{
		if insert {
			if self.id.is_not_set() {
				self.id = Set(uuid::Uuid::new_v4().to_string());
			}
			if self.slug.is_not_set() {
				let slug = slugify!(self.name.as_ref().as_str());
				self.slug = Set(slug);
			}
			if self.created_at.is_not_set() {
				self.created_at = Set(DateTimeWithTimeZone::from(Utc::now()));
			}
			if self.member_role_spec.is_not_set() {
				self.member_role_spec = Set(Some(BookClubMemberRoleSpec::default()));
			}
		}

		Ok(self)
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::tests::common::*;
	use pretty_assertions::assert_eq;

	#[test]
	fn test_all_for_user_server_owner() {
		let user = get_default_user();
		let select = Entity::find_all_for_user(true, &user);
		let stmt_str = select_no_cols_to_string(select);
		assert_eq!(
			stmt_str,
			r#"SELECT  FROM "book_clubs" WHERE TRUE"#.to_string()
		);
	}

	#[test]
	fn test_all_for_user() {
		let mut user = get_default_user();
		user.is_server_owner = false;

		let select = Entity::find_all_for_user(true, &user);
		let stmt_str = select_no_cols_to_string(select);
		assert_eq!(stmt_str, r#"SELECT  FROM "book_clubs" WHERE "book_clubs"."is_private" = FALSE OR "book_clubs"."id" IN (SELECT "book_club_id" FROM "book_club_members" WHERE "book_club_members"."user_id" = '42')"#.to_string());
	}

	#[test]
	fn test_all_for_user_member() {
		let mut user = get_default_user();
		user.is_server_owner = false;

		let select = Entity::find_all_for_user(false, &user);
		let stmt_str = select_no_cols_to_string(select);
		assert_eq!(stmt_str, r#"SELECT  FROM "book_clubs" WHERE "book_clubs"."id" IN (SELECT "book_club_id" FROM "book_club_members" WHERE "book_club_members"."user_id" = '42')"#.to_string());
	}

	#[test]
	fn test_for_id_and_user() {
		let mut user = get_default_user();
		user.is_server_owner = false;

		let select = Entity::find_by_id_and_user("314", &user);
		let stmt_str = select_no_cols_to_string(select);
		assert_eq!(stmt_str, r#"SELECT  FROM "book_clubs" WHERE ("book_clubs"."is_private" = FALSE OR "book_clubs"."id" IN (SELECT "book_club_id" FROM "book_club_members" WHERE "book_club_members"."user_id" = '42')) AND "book_clubs"."id" = '314'"#.to_string());
	}

	#[test]
	fn find_for_member_enforce_role() {
		let mut user = get_default_user();
		user.is_server_owner = false;

		let select =
			Entity::find_for_member_enforce_role(&user, BookClubMemberRole::Moderator);
		let stmt_str = select_no_cols_to_string(select);
		assert_eq!(stmt_str, r#"SELECT  FROM "book_clubs" WHERE "book_clubs"."id" IN (SELECT "book_club_id" FROM "book_club_members" WHERE "book_club_members"."user_id" = '42' AND "book_club_members"."role" >= 1)"#.to_string());
	}

	#[test]
	fn find_for_member_enforce_role_server_owner() {
		let mut user = get_default_user();
		user.is_server_owner = true;

		let select =
			Entity::find_for_member_enforce_role(&user, BookClubMemberRole::Moderator);
		let stmt_str = select_no_cols_to_string(select);
		assert_eq!(
			stmt_str,
			r#"SELECT  FROM "book_clubs" WHERE TRUE"#.to_string()
		);
	}
}
