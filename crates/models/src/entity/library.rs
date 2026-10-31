use async_graphql::SimpleObject;
use chrono::Utc;
use filter_gen::Ordering;
use sea_orm::{
	entity::prelude::*, prelude::async_trait::async_trait, ActiveValue,
	DerivePartialModel,
};

use crate::shared::{
	enums::FileStatus,
	image::ImageMetadata,
	ordering::{OrderDirection, OrderingField},
};

use super::{
	last_library_visit, library_config, library_exclusion, library_scan_record, series,
	user::AuthUser,
};

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject, Ordering)]
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
	pub status: FileStatus,
	#[sea_orm(column_type = "Json", nullable)]
	pub thumbnail_meta: Option<ImageMetadata>,
	#[sea_orm(column_type = "Text", nullable)]
	pub thumbnail_path: Option<String>,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub created_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub updated_at: Option<DateTimeWithTimeZone>,
	#[sea_orm(column_type = "Text", nullable)]
	pub emoji: Option<String>,
	pub config_id: i32,
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub last_scanned_at: Option<DateTimeWithTimeZone>,
	#[sea_orm(has_many)]
	#[graphql(skip)]
	pub last_library_visit: HasMany<last_library_visit::Entity>,
	#[sea_orm(has_many, relation_enum = "HiddenFromUsers")]
	#[graphql(skip)]
	pub library_exclusions: HasMany<library_exclusion::Entity>,
	#[sea_orm(
		belongs_to,
		from = "config_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Restrict"
	)]
	#[graphql(skip)]
	pub config: BelongsTo<library_config::Entity>,
	#[sea_orm(has_many, relation_enum = "LibraryScanRecords")]
	#[graphql(skip)]
	pub library_scan_records: HasMany<library_scan_record::Entity>,
	#[sea_orm(has_many)]
	#[graphql(skip)]
	pub series: HasMany<series::Entity>,
}

impl Entity {
	pub fn find_for_user(user: &AuthUser) -> Select<Entity> {
		Entity::find().filter(Column::Id.not_in_subquery(
			library_exclusion::Entity::library_hidden_to_user_query(user),
		))
	}
}

#[derive(Clone, Debug, DerivePartialModel)]
#[sea_orm(entity = "<Model as ModelTrait>::Entity")]
pub struct LibraryIdentSelect {
	pub id: String,
	pub name: String,
	pub path: String,
}

impl LibraryIdentSelect {
	pub fn columns() -> Vec<Column> {
		vec![Column::Id, Column::Name, Column::Path]
	}
}

#[derive(Clone, Debug, DerivePartialModel)]
#[sea_orm(entity = "<Model as ModelTrait>::Entity")]
pub struct LibraryThumbSelect {
	pub id: String,
	pub name: String,
	pub path: String,
	pub thumbnail_path: Option<String>,
	pub thumbnail_meta: Option<crate::shared::image::ImageMetadata>,
}

impl LibraryThumbSelect {
	pub fn columns() -> Vec<Column> {
		vec![
			Column::Id,
			Column::Name,
			Column::Path,
			Column::ThumbnailPath,
			Column::ThumbnailMeta,
		]
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
				self.id = ActiveValue::Set(Uuid::new_v4().to_string());
			}

			if self.status.is_not_set() {
				self.status = ActiveValue::Set(FileStatus::Ready);
			}

			self.created_at = ActiveValue::Set(DateTimeWithTimeZone::from(Utc::now()));
		} else {
			self.updated_at =
				ActiveValue::Set(Some(DateTimeWithTimeZone::from(Utc::now())));
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
			r#"SELECT  FROM "libraries" WHERE "libraries"."id" NOT IN (SELECT "library_id" FROM "library_exclusions" WHERE "library_exclusions"."user_id" = '42')"#
		);
	}
}
