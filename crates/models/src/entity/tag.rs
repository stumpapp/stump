use super::{library_tag, media_tag, series_tag};
use async_graphql::SimpleObject;
use sea_orm::{entity::prelude::*, JoinType, QuerySelect};

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, SimpleObject)]
#[graphql(name = "TagModel")]
#[sea_orm(table_name = "tags")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = true)]
	pub id: i32,
	#[sea_orm(column_type = "Text", unique)]
	pub name: String,
	#[sea_orm(has_many, relation_enum = "MediaTags")]
	#[graphql(skip)]
	pub media_tags: HasMany<media_tag::Entity>,
	#[sea_orm(has_many, relation_enum = "SeriesTags")]
	#[graphql(skip)]
	pub series_tags: HasMany<series_tag::Entity>,
	#[sea_orm(has_many, relation_enum = "LibraryTags")]
	#[graphql(skip)]
	pub library_tags: HasMany<library_tag::Entity>,
}

impl ActiveModelBehavior for ActiveModel {}

impl Entity {
	pub fn find_for_media_id(media_id: &str) -> sea_orm::Select<Entity> {
		Entity::find()
			.join(JoinType::InnerJoin, Relation::MediaTags.def())
			.filter(media_tag::Column::MediaId.eq(media_id))
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
			r#"SELECT  FROM "tags" INNER JOIN "media_tags" ON "tags"."id" = "media_tags"."tag_id" WHERE "media_tags"."media_id" = '123'"#
		);
	}
}
