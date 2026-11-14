use super::user::AuthUser;
use sea_orm::{
	entity::prelude::*,
	sea_query::{Query, SelectStatement},
};

use super::{series, user};

/// A grant which shares a single series (and therefore all of its books) with a user. Shares
/// take precedence over library exclusions, so a user who has been excluded from a library can
/// still see the series in that library which have been shared with them.
#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "series_shares")]
pub struct Model {
	#[sea_orm(primary_key)]
	pub id: i32,
	#[sea_orm(column_type = "Text")]
	pub user_id: String,
	#[sea_orm(column_type = "Text")]
	pub series_id: String,
	#[sea_orm(
		belongs_to,
		from = "series_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	pub series: BelongsTo<series::Entity>,
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
	/// A subquery which selects the IDs of all series shared with the user
	pub fn series_shared_with_user_query(user: &AuthUser) -> SelectStatement {
		Query::select()
			.column(Column::SeriesId)
			.from(Entity)
			.and_where(Column::UserId.eq(user.id.clone()))
			.to_owned()
	}

	/// A subquery which selects the IDs of all libraries which contain at least one series
	/// shared with the user
	pub fn libraries_with_shared_series_query(user: &AuthUser) -> SelectStatement {
		Query::select()
			.column(series::Column::LibraryId)
			.from(series::Entity)
			.and_where(
				series::Column::Id.in_subquery(Self::series_shared_with_user_query(user)),
			)
			.to_owned()
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::tests::common::*;
	use pretty_assertions::assert_eq;

	#[test]
	fn test_series_shared_with_user_query() {
		let user = get_default_user();
		let stmt_str = Entity::series_shared_with_user_query(&user)
			.to_string(sea_orm::sea_query::SqliteQueryBuilder);
		assert_eq!(
			stmt_str,
			r#"SELECT "series_id" FROM "series_shares" WHERE "series_shares"."user_id" = '42'"#
		);
	}

	#[test]
	fn test_libraries_with_shared_series_query() {
		let user = get_default_user();
		let stmt_str = Entity::libraries_with_shared_series_query(&user)
			.to_string(sea_orm::sea_query::SqliteQueryBuilder);
		assert_eq!(
			stmt_str,
			r#"SELECT "library_id" FROM "series" WHERE "series"."id" IN (SELECT "series_id" FROM "series_shares" WHERE "series_shares"."user_id" = '42')"#
		);
	}
}
