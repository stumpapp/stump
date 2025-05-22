use super::media_to_tag;
use async_graphql::SimpleObject;
use sea_orm::{entity::prelude::*, JoinType, QuerySelect};

#[derive(
	Clone, Debug, PartialEq, Eq, PartialOrd, Ord, DeriveEntityModel, SimpleObject,
)]
#[graphql(name = "TagModel")]
#[sea_orm(table_name = "tags")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text", unique)]
	pub name: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(has_many = "super::media_to_tag::Entity")]
	MediaToTag,
}

impl ActiveModelBehavior for ActiveModel {}

impl Entity {
	pub fn find_for_media_id(media_id: &str) -> sea_orm::Select<Entity> {
		Entity::find()
			.join(JoinType::InnerJoin, Relation::MediaToTag.def())
			.filter(media_to_tag::Column::MediaId.eq(media_id))
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::tests::common::*;
	use pretty_assertions::assert_eq;

	#[test]
	fn test_find_for_media_id() {
		let query = Entity::find_for_media_id("123");
		assert_eq!(
			select_no_cols_to_string(query),
			r#"SELECT  FROM "tags" INNER JOIN "_media_to_tag" ON "tags"."id" = "_media_to_tag"."tag_id" WHERE "_media_to_tag"."media_id" = '123'"#
		);
	}
}
