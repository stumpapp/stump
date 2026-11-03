use super::{
	book_club, book_club_book_suggestion, book_club_book_suggestion_like,
	book_club_discussion_message, book_club_discussion_message_reaction,
	book_club_member_favorite_book, user, user::AuthUser,
};
use async_graphql::SimpleObject;
use sea_orm::{
	prelude::*,
	sea_query::{Query, SimpleExpr},
	ColumnTrait, Condition, ExprTrait,
};

use crate::shared::book_club::BookClubMemberRole;

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "BookClubMemberModel")]
#[sea_orm(table_name = "book_club_members")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub display_name: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub bio: Option<String>,
	// TODO: make opt-in, i.e. "share reading progress"
	// for simplicity i think it would be all or nothing, i don't want to maintain
	// something like "only share the percentage and the day" or whatever. if you share,
	// then members can see the reading sessions and stuff. if not, cool
	pub hide_progress: bool,
	pub role: BookClubMemberRole,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub joined_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "Text")]
	pub user_id: String,
	#[sea_orm(column_type = "Text")]
	pub book_club_id: String,
	#[sea_orm(has_many)]
	#[graphql(skip)]
	pub suggestion_likes: HasMany<book_club_book_suggestion_like::Entity>,
	#[sea_orm(has_many)]
	#[graphql(skip)]
	pub suggestions: HasMany<book_club_book_suggestion::Entity>,
	#[sea_orm(has_many)]
	#[graphql(skip)]
	pub message_reactions: HasMany<book_club_discussion_message_reaction::Entity>,
	#[sea_orm(has_many)]
	#[graphql(skip)]
	pub messages: HasMany<book_club_discussion_message::Entity>,
	#[sea_orm(has_one)]
	#[graphql(skip)]
	pub favorite_books: HasOne<book_club_member_favorite_book::Entity>,
	#[sea_orm(
		belongs_to,
		from = "book_club_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	#[graphql(skip)]
	pub book_club: BelongsTo<book_club::Entity>,
	#[sea_orm(
		belongs_to,
		from = "user_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	#[graphql(skip)]
	pub user: BelongsTo<user::Entity>,
}

impl ActiveModelBehavior for ActiveModel {}

impl Entity {
	fn members_accessible_to_user_for_book_club_member(user: &AuthUser) -> SimpleExpr {
		Column::BookClubId.in_subquery(
			Query::select()
				.column(Column::BookClubId)
				.from(Self)
				.and_where(Column::UserId.eq(user.id.clone()))
				.to_owned(),
		)
	}

	fn members_accessible_to_user_for_non_book_club_member() -> Condition {
		Condition::all().add(
			Column::BookClubId.in_subquery(
				Query::select()
					.column(book_club::Column::Id)
					.from(Self)
					.and_where(book_club::Column::IsPrivate.eq(false))
					.to_owned(),
			),
		)
	}

	pub fn find_members_accessible_to_user(user: &AuthUser) -> Select<Self> {
		if user.is_server_owner {
			Self::find()
		} else {
			Self::find().filter(
				Condition::any()
					.add(Self::members_accessible_to_user_for_book_club_member(user))
					.add(Self::members_accessible_to_user_for_non_book_club_member()),
			)
		}
	}

	pub fn find_members_accessible_to_user_for_book_club_id(
		user: &AuthUser,
		book_club_id: &str,
	) -> Select<Self> {
		Self::find_members_accessible_to_user(user)
			.filter(Column::BookClubId.eq(book_club_id))
	}

	pub fn find_by_club_for_user(user: &AuthUser, book_club_id: &str) -> Select<Self> {
		Self::find().filter(
			Column::BookClubId
				.eq(book_club_id)
				.and(Column::UserId.eq(user.id.clone())),
		)
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::tests::common::*;
	use pretty_assertions::assert_eq;

	#[test]
	fn test_find_members_accessible_to_user() {
		let mut user = get_default_user();
		user.is_server_owner = false;

		let select = Entity::find_members_accessible_to_user(&user);
		assert_eq!(
			select_no_cols_to_string(select),
			(r#"SELECT  FROM "book_club_members" WHERE "#.to_string()
				+ r#""book_club_members"."book_club_id" IN (SELECT "book_club_id" FROM "book_club_members" WHERE "book_club_members"."user_id" = '42') "#
				+ r#"OR "book_club_members"."book_club_id" IN (SELECT "id" FROM "book_club_members" WHERE "book_clubs"."is_private" = FALSE)"#)
		);
	}

	#[test]
	fn test_find_members_accessible_to_user_server_owner() {
		let user = get_default_user();

		let select = Entity::find_members_accessible_to_user(&user);
		assert_eq!(
			select_no_cols_to_string(select),
			r#"SELECT  FROM "book_club_members""#.to_string()
		);
	}

	#[test]
	fn test_find_members_accessible_to_book_club_id_for_server_owner() {
		let user = get_default_user();

		let select =
			Entity::find_members_accessible_to_user_for_book_club_id(&user, "321");
		assert_eq!(
			select_no_cols_to_string(select),
			(r#"SELECT  FROM "book_club_members" WHERE "book_club_members"."book_club_id" = '321'"#)
		);
	}
}
