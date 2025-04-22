use async_graphql::SimpleObject;
use sea_orm::{
	entity::prelude::*, prelude::async_trait::async_trait, ActiveValue,
	DerivePartialModel, FromQueryResult,
};

use super::{library_hidden_to_user, user::AuthUser};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "LibraryModel")]
#[sea_orm(table_name = "libraries")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text", unique)]
	pub name: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub description: Option<String>,
	#[sea_orm(column_type = "Text", unique)]
	pub path: String,
	#[sea_orm(column_type = "Text")]
	pub status: String,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub updated_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub created_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "Text", nullable)]
	pub emoji: Option<String>,
	pub config_id: i32,
	#[sea_orm(column_type = "Text", nullable)]
	pub job_schedule_config_id: Option<String>,
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub last_scanned_at: Option<String>,
}

impl Entity {
	pub fn find_for_user(user: &AuthUser) -> Select<Entity> {
		Entity::find().filter(Column::Id.not_in_subquery(
			library_hidden_to_user::Entity::library_hidden_to_user_query(user),
		))
	}
}

#[derive(Clone, Debug, DerivePartialModel, FromQueryResult)]
#[sea_orm(entity = "<Model as ModelTrait>::Entity")]
pub struct LibraryIdentSelect {
	pub id: String,
	pub name: String,
	pub path: String,
}

impl LibraryIdentSelect {
	// TODO: make a trait
	pub fn columns() -> Vec<Column> {
		vec![Column::Id, Column::Name, Column::Path]
	}
}

#[derive(Debug, FromQueryResult)]
pub struct LibraryNameCmpSelect {
	pub name: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(
		belongs_to = "super::job_schedule_config::Entity",
		from = "Column::JobScheduleConfigId",
		to = "super::job_schedule_config::Column::Id",
		on_update = "Cascade",
		on_delete = "SetNull"
	)]
	JobScheduleConfig,
	#[sea_orm(has_many = "super::last_library_visit::Entity")]
	LastLibraryVisit,
	#[sea_orm(has_many = "super::library_hidden_to_user::Entity")]
	HiddenFromUsers,
	#[sea_orm(
		belongs_to = "super::library_config::Entity",
		from = "Column::ConfigId",
		to = "super::library_config::Column::Id",
		on_update = "Cascade",
		on_delete = "Restrict"
	)]
	LibraryConfig,
	#[sea_orm(has_many = "super::library_scan_record::Entity")]
	LibraryScanRecords,
	#[sea_orm(has_many = "super::series::Entity")]
	Series,
}

impl Related<super::job_schedule_config::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::JobScheduleConfig.def()
	}
}

impl Related<super::last_library_visit::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::LastLibraryVisit.def()
	}
}

impl Related<super::library_hidden_to_user::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::HiddenFromUsers.def()
	}
}

impl Related<super::library_config::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::LibraryConfig.def()
	}
}

impl Related<super::library_scan_record::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::LibraryScanRecords.def()
	}
}

impl Related<super::series::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Series.def()
	}
}

#[async_trait]
impl ActiveModelBehavior for ActiveModel {
	async fn before_save<C>(mut self, _db: &C, insert: bool) -> Result<Self, DbErr>
	where
		C: ConnectionTrait,
	{
		if insert && self.id.is_not_set() {
			self.id = ActiveValue::Set(Uuid::new_v4().to_string());
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
	fn find_for_user() {
		let user = get_default_user();
		let select = Entity::find_for_user(&user);
		let stmt_str = select_no_cols_to_string(select);
		assert_eq!(
			stmt_str,
			r#"SELECT  FROM "libraries" WHERE "libraries"."id" NOT IN (SELECT "library_id" FROM "_library_hidden_to_user" WHERE "_library_hidden_to_user"."user_id" = '42')"#
		);
	}
}
