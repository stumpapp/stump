use async_graphql::SimpleObject;
use sea_orm::{prelude::*, Condition, FromQueryResult};

use super::reading_list_rule;

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

fn get_reading_list_rbac_for_user(user_id: &String, minimum_role: i32) -> Condition {
	// A common condition that asserts there is a RBAC entry for the user that has a role
	// greater than or equal to the minimum role:
	// 1 for reader, 2 for collaborator, 3 for creator
	let base_rbac = Condition::all()
		.add(reading_list_rule::Column::UserId.eq(user_id.clone()))
		.add(reading_list_rule::Column::Role.gte(minimum_role));

	Condition::any()
		// creator always has access
		.add(Column::CreatingUserId.eq(user_id.clone()))
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
		// condition where visibility is PRIVATE:
		.add(
			Condition::all()
				.add(Column::Visibility.eq("PRIVATE".to_string()))
				.add(Column::CreatingUserId.eq(user_id)),
		)
}

#[derive(Debug, FromQueryResult)]
pub struct ReadingListIdCmpSelect {
	pub id: String,
}

impl Entity {
	pub fn find_for_user(user_id: &String, minimum_role: i32) -> Select<Entity> {
		Entity::find()
			.left_join(reading_list_rule::Entity)
			.filter(get_reading_list_rbac_for_user(user_id, minimum_role))
	}
}
