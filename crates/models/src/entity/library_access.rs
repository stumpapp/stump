use super::user::AuthUser;
use sea_orm::{
	entity::prelude::*,
	sea_query::{Query, SelectStatement},
};

use super::{library, user};

/// a junction table for granting users access to libraries
#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "library_access")]
pub struct Model {
	#[sea_orm(primary_key)]
	pub id: i32,
	#[sea_orm(column_type = "Text")]
	pub user_id: String,
	#[sea_orm(column_type = "Text")]
	pub library_id: String,
	#[sea_orm(
		belongs_to,
		from = "library_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	pub library: BelongsTo<library::Entity>,
	#[sea_orm(
		belongs_to,
		from = "user_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	pub user: BelongsTo<user::Entity>,
}

impl ActiveModelBehavior for ActiveModel {}

impl Entity {
	pub fn for_user(user: &AuthUser) -> SelectStatement {
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
		let stmt_str =
			Entity::for_user(&user).to_string(sea_orm::sea_query::SqliteQueryBuilder);
		assert_eq!(
			stmt_str,
			r#"SELECT "library_id" FROM "library_access" WHERE "library_access"."user_id" = '42'"#
		);
	}
}
