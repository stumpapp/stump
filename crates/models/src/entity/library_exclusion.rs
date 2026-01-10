use super::user::AuthUser;
use sea_orm::{
	entity::prelude::*,
	sea_query::{Query, SelectStatement},
};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "library_exclusions")]
pub struct Model {
	#[sea_orm(primary_key)]
	pub id: i32,
	#[sea_orm(column_type = "Text")]
	pub user_id: String,
	#[sea_orm(column_type = "Text")]
	pub library_id: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(
		belongs_to = "super::library::Entity",
		from = "Column::LibraryId",
		to = "super::library::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	Library,
	#[sea_orm(
		belongs_to = "super::user::Entity",
		from = "Column::UserId",
		to = "super::user::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	User,
}

impl Related<super::library::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Library.def()
	}
}

impl Related<super::user::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::User.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}

impl Entity {
	pub fn library_hidden_to_user_query(user: &AuthUser) -> SelectStatement {
		Query::select()
			.column(Column::LibraryId)
			.from(Entity)
			.and_where(Column::UserId.eq(user.id.clone()))
			.to_owned()
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::tests::common::*;
	use pretty_assertions::assert_eq;

	#[test]
	fn test_query() {
		let user = get_default_user();
		let stmt_str = Entity::library_hidden_to_user_query(&user)
			.to_string(sea_orm::sea_query::SqliteQueryBuilder);
		assert_eq!(
			stmt_str,
			r#"SELECT "library_id" FROM "library_exclusions" WHERE "library_exclusions"."user_id" = '42'"#
		);
	}
}
