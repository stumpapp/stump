use async_graphql::{Enum, SimpleObject, ID};
use filter_gen::Ordering;
use sea_orm::{
	prelude::*, Condition, DeriveActiveEnum, EnumIter, QuerySelect, QueryTrait,
};
use serde::{Deserialize, Serialize};
use strum::{Display, EnumString};

use super::{smart_list_access_rule, smart_list_view, user};
use crate::{
	entity::user::AuthUser,
	shared::{
		enums::{AccessRole, EntityVisibility},
		ordering::{OrderDirection, OrderingField},
	},
};

/// The different filter joiners that can be used in smart lists
#[derive(
	Eq,
	Copy,
	Hash,
	Debug,
	Clone,
	Default,
	EnumIter,
	PartialEq,
	Serialize,
	Deserialize,
	DeriveActiveEnum,
	EnumString,
	Display,
	Enum,
)]
#[sea_orm(
	rs_type = "String",
	rename_all = "SCREAMING_SNAKE_CASE",
	db_type = "String(StringLen::None)"
)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
pub enum SmartListJoiner {
	#[default]
	And,
	Or,
}

/// The different grouping options for smart lists
#[derive(
	Eq,
	Copy,
	Hash,
	Debug,
	Clone,
	Default,
	EnumIter,
	PartialEq,
	Serialize,
	Deserialize,
	DeriveActiveEnum,
	EnumString,
	Display,
	Enum,
)]
#[sea_orm(
	rs_type = "String",
	rename_all = "SCREAMING_SNAKE_CASE",
	db_type = "String(StringLen::None)"
)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
pub enum SmartListGrouping {
	#[default]
	ByBooks,
	BySeries,
	ByLibrary,
}

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject, Ordering)]
#[graphql(name = "SmartListModel")]
#[sea_orm(table_name = "smart_lists")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text")]
	pub name: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub description: Option<String>,
	#[sea_orm(column_type = "Blob")]
	#[graphql(skip)]
	pub filters: Vec<u8>,
	#[sea_orm(column_type = "Text")]
	pub joiner: SmartListJoiner,
	#[sea_orm(column_type = "Text")]
	pub default_grouping: SmartListGrouping,
	#[sea_orm(column_type = "Text")]
	pub visibility: EntityVisibility,
	#[sea_orm(column_type = "Text")]
	pub creator_id: String,
	#[sea_orm(has_many)]
	#[graphql(skip)]
	pub access_rules: HasMany<smart_list_access_rule::Entity>,
	#[sea_orm(has_many)]
	#[graphql(skip)]
	pub views: HasMany<smart_list_view::Entity>,
	#[sea_orm(
		belongs_to,
		from = "creator_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	#[graphql(skip)]
	pub creator: BelongsTo<user::Entity>,
}

impl ActiveModelBehavior for ActiveModel {}

fn get_access_condition_base_subquery(
	user: &AuthUser,
) -> Select<smart_list_access_rule::Entity> {
	smart_list_access_rule::Entity::find()
		.select_only()
		.column(Column::Id)
		.inner_join(Entity)
		.filter(smart_list_access_rule::Column::UserId.eq(user.id.clone()))
}

fn get_access_condition_base_rule(user: &AuthUser, role: AccessRole) -> Condition {
	// A common condition that asserts there is an entry for the user that has a role
	// greater than or equal to the minimum role:
	// 1 for reader, 2 for collaborator, 3 for co-creator
	let select = get_access_condition_base_subquery(user)
		.filter(smart_list_access_rule::Column::Role.gte(role as i32));

	Condition::all().add(Column::Id.in_subquery(select.into_query()))
}

fn get_access_condition_for_user_public(
	user: &AuthUser,
	base_rule: Condition,
) -> Condition {
	let select = get_access_condition_base_subquery(user);
	Condition::all()
		.add(Column::Visibility.eq(EntityVisibility::Public))
		// This asserts the reader rule is present OR there is no rule for the user
		.add(
			Condition::any()
				.add(base_rule)
				.add(Column::Id.not_in_subquery(select.into_query())),
		)
}

fn get_access_rule(user: &AuthUser, base_rule: Condition) -> Condition {
	Condition::any()
		// creator always has access
		.add(Column::CreatorId.eq(user.id.clone()))
		// condition where visibility is PUBLIC
		.add(get_access_condition_for_user_public(
			user,
			base_rule.clone(),
		))
		// condition where visibility is SHARED
		.add(
			Condition::all()
				.add(Column::Visibility.eq(EntityVisibility::Shared))
				.add(base_rule),
		)
		// condition where visibility is PRIVATE
		.add(
			Condition::all()
				.add(Column::Visibility.eq(EntityVisibility::Private))
				.add(Column::CreatorId.eq(user.id.clone())),
		)
}

pub fn get_access_condition_for_user(
	user: &AuthUser,
	query_all: bool,
	query_mine: bool,
) -> Option<Condition> {
	if !query_all && !query_mine {
		let base_rule = get_access_condition_base_rule(user, AccessRole::Reader);
		Some(get_access_rule(user, base_rule))
	} else if query_mine {
		Some(Condition::all().add(Column::CreatorId.eq(user.id.clone())))
	} else {
		None
	}
}

fn get_search_condition(search: Option<String>) -> Option<Condition> {
	search.and_then(|s| {
		if s.is_empty() {
			None
		} else {
			Some(
				Condition::any()
					.add(Column::Name.contains(&s))
					.add(Column::Description.contains(s)),
			)
		}
	})
}

impl Entity {
	pub fn find_for_user(
		user: &AuthUser,
		query_all: bool,
		query_mine: bool,
		search: Option<String>,
	) -> Select<Self> {
		Entity::find().filter(
			Condition::all()
				.add_option(get_search_condition(search))
				.add_option(get_access_condition_for_user(user, query_all, query_mine)),
		)
	}

	pub fn find_by_id(user: &AuthUser, id: ID) -> Select<Self> {
		Entity::find().filter(
			Condition::all()
				.add_option(get_access_condition_for_user(user, false, false))
				.add(Column::Id.eq(id.to_string())),
		)
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::tests::common::*;
	use pretty_assertions::assert_eq;

	#[test]
	fn test_access_rules_base_rule() {
		let user = get_default_user();

		let condition = get_access_condition_base_rule(&user, AccessRole::Reader);

		let sql = condition_to_string(&condition);
		assert_eq!(
			sql,
			r#"SELECT  WHERE "smart_lists"."id" IN (SELECT "smart_lists"."id" "#
				.to_string() + r#"FROM "smart_list_access_rules" INNER JOIN "smart_lists" ON "#
				+ r#""smart_list_access_rules"."smart_list_id" = "smart_lists"."id" WHERE "#
				+ r#""smart_list_access_rules"."user_id" = '42' AND "#
				+ r#""smart_list_access_rules"."role" >= 1"#
				+ r#")"#
		);
	}

	#[test]
	fn test_access_rules_public() {
		let user = get_default_user();
		let condition = get_access_condition_for_user_public(&user, Condition::all());

		let sql = condition_to_string(&condition);
		assert_eq!(
			sql,
			r#"SELECT  WHERE "smart_lists"."visibility" = 'PUBLIC' AND (TRUE OR "smart_lists"."id" NOT IN (SELECT "smart_lists"."id" "#
				.to_string() + r#"FROM "smart_list_access_rules" INNER JOIN "smart_lists" ON "#
				+ r#""smart_list_access_rules"."smart_list_id" = "smart_lists"."id" WHERE "#
				+ r#""smart_list_access_rules"."user_id" = '42')"#
				+ r#")"#
		);
	}

	#[test]
	fn test_access_rule() {
		let user = get_default_user();
		let condition = get_access_rule(&user, Condition::all());

		let sql = condition_to_string(&condition);
		assert_eq!(
			sql,
			r#"SELECT  WHERE "#.to_string()
				+ r#""smart_lists"."creator_id" = '42' OR ("#
				+ r#""smart_lists"."visibility" = 'PUBLIC' AND (TRUE OR "smart_lists"."id" NOT IN (SELECT "smart_lists"."id" "#
				+ r#"FROM "smart_list_access_rules" INNER JOIN "smart_lists" ON "#
				+ r#""smart_list_access_rules"."smart_list_id" = "smart_lists"."id" WHERE "#
				+ r#""smart_list_access_rules"."user_id" = '42')"#
				+ r#")) OR "#
				+ r#"("smart_lists"."visibility" = 'SHARED' AND TRUE) OR "#
				+ r#"("smart_lists"."visibility" = 'PRIVATE' AND "smart_lists"."creator_id" = '42')"#
		);
	}
}
