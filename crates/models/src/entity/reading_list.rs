use async_graphql::SimpleObject;
use sea_orm::{prelude::*, Condition, FromQueryResult, QueryOrder};

use super::{reading_list_rule, user::AuthUser};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "ReadingListModel")]
#[sea_orm(table_name = "reading_lists")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text")]
	pub name: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub description: Option<String>,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub updated_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "Text")]
	pub visibility: String,
	#[sea_orm(column_type = "Text")]
	pub ordering: String,
	#[sea_orm(column_type = "Text")]
	pub creating_user_id: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(has_many = "super::reading_list_item::Entity")]
	ReadingListItems,
	#[sea_orm(has_many = "super::reading_list_rule::Entity")]
	ReadingListRules,
	#[sea_orm(
		belongs_to = "super::user::Entity",
		from = "Column::CreatingUserId",
		to = "super::user::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	User,
}

impl Related<super::reading_list_item::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::ReadingListItems.def()
	}
}

impl Related<super::reading_list_rule::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::ReadingListRules.def()
	}
}

impl Related<super::user::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::User.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}

fn get_reading_list_rbac_for_user(user_id: &str, minimum_role: i32) -> Condition {
	// A common condition that asserts there is a RBAC entry for the user that has a role
	// greater than or equal to the minimum role:
	// 1 for reader, 2 for collaborator, 3 for creator
	let base_rbac = Condition::all()
		.add(reading_list_rule::Column::UserId.eq(user_id.to_owned()))
		.add(reading_list_rule::Column::Role.gte(minimum_role));

	Condition::any()
		// creator always has access
		.add(Column::CreatingUserId.eq(user_id.to_owned()))
		// condition where visibility is PUBLIC:
		.add(
			Condition::all()
				.add(Column::Visibility.eq("PUBLIC".to_string()))
				// This asserts the reader RBAC is present OR there is no RBAC present
				.add(
					Condition::any()
						.add(base_rbac.clone())
						.add(reading_list_rule::Column::UserId.is_null()),
				),
		)
		// condition where visibility is SHARED:
		.add(
			Condition::all()
				.add(Column::Visibility.eq("SHARED".to_string()))
				.add(base_rbac),
		)
}

#[derive(Debug, FromQueryResult)]
pub struct ReadingListIdCmpSelect {
	pub id: String,
}

impl Entity {
	pub fn find_for_user(user: &AuthUser, minimum_role: i32) -> Select<Entity> {
		Entity::find()
			.left_join(reading_list_rule::Entity)
			.filter(get_reading_list_rbac_for_user(&user.id, minimum_role))
			.order_by_asc(Column::Id)
	}

	pub fn find_for_user_and_id(
		user: &AuthUser,
		minimum_role: i32,
		id: &str,
	) -> Select<Entity> {
		Entity::find()
			.left_join(reading_list_rule::Entity)
			.filter(Column::Id.eq(id))
			.filter(get_reading_list_rbac_for_user(&user.id, minimum_role))
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::tests::common::*;
	use pretty_assertions::assert_eq;

	#[test]
	fn test_reading_list_rbac() {
		let condition = get_reading_list_rbac_for_user("42", 1);
		assert_eq!(
			condition_to_string(&condition),
			r#"SELECT  WHERE "#.to_string()
				+ r#""reading_lists"."creating_user_id" = '42' OR "#
				+ r#"("reading_lists"."visibility" = 'PUBLIC' AND (("reading_list_rules"."user_id" = '42' AND "reading_list_rules"."role" >= 1) OR "reading_list_rules"."user_id" IS NULL)) OR "#
				+ r#"("reading_lists"."visibility" = 'SHARED' AND ("reading_list_rules"."user_id" = '42' AND "reading_list_rules"."role" >= 1))"#
		);
	}

	#[test]
	fn test_find_for_user() {
		let user = get_default_user();
		let stmt = Entity::find_for_user(&user, 1);
		assert_eq!(
			select_no_cols_to_string(stmt),
			r#"SELECT  FROM "reading_lists" LEFT JOIN "reading_list_rules" ON "reading_lists"."id" = "reading_list_rules"."reading_list_id" WHERE "#.to_string()
				+ r#""reading_lists"."creating_user_id" = '42' OR "#
				+ r#"("reading_lists"."visibility" = 'PUBLIC' AND (("reading_list_rules"."user_id" = '42' AND "reading_list_rules"."role" >= 1) OR "reading_list_rules"."user_id" IS NULL)) OR "#
				+ r#"("reading_lists"."visibility" = 'SHARED' AND ("reading_list_rules"."user_id" = '42' AND "reading_list_rules"."role" >= 1))"#
                + r#" ORDER BY "reading_lists"."id" ASC"#
		);
	}

	#[test]
	fn test_find_for_user_and_id() {
		let user = get_default_user();
		let stmt = Entity::find_for_user_and_id(&user, 1, "314");
		assert_eq!(
			select_no_cols_to_string(stmt),
			r#"SELECT  FROM "reading_lists" LEFT JOIN "reading_list_rules" ON "reading_lists"."id" = "reading_list_rules"."reading_list_id" WHERE "#.to_string()
				+ r#""reading_lists"."id" = '314' AND "#
				+ r#"("reading_lists"."creating_user_id" = '42' OR "#
				+ r#"("reading_lists"."visibility" = 'PUBLIC' AND (("reading_list_rules"."user_id" = '42' AND "reading_list_rules"."role" >= 1) OR "reading_list_rules"."user_id" IS NULL)) OR "#
				+ r#"("reading_lists"."visibility" = 'SHARED' AND ("reading_list_rules"."user_id" = '42' AND "reading_list_rules"."role" >= 1)))"#
		);
	}
}
