use crate::{
	data::CoreContext,
	object::tag::{LibraryTag, Tag},
};
use async_graphql::{Context, Object, Result, ID};
use models::entity::{media, media_tag, series, tag};
use sea_orm::{prelude::*, FromQueryResult, JoinType, QueryOrder, QuerySelect};

#[derive(Default)]
pub struct TagQuery;

#[derive(Debug, FromQueryResult)]
struct TagNameCount {
	tag_id: i32,
	name: String,
	count: i64,
}

async fn get_tags(conn: &DatabaseConnection) -> Result<Vec<Tag>> {
	let query = tag::Entity::find()
		.into_model::<tag::Model>()
		.all(conn)
		.await?;

	Ok(query.into_iter().map(Tag::from).collect())
}

/// Returns the tags present on books in the given library, with the number of
/// books holding each tag. Tags are derived from `media_tags` (the tags
/// actually applied to the library's books) rather than the `library_tags`
/// table, so tags added to books after a scan (manually or via LLM tagging)
/// are included.
async fn get_library_tags(
	conn: &DatabaseConnection,
	library_id: &str,
) -> Result<Vec<LibraryTag>> {
	let tag_counts = media_tag::Entity::find()
		.join(JoinType::InnerJoin, media_tag::Relation::Tag.def())
		.join(JoinType::InnerJoin, media_tag::Relation::Media.def())
		.join(JoinType::InnerJoin, media::Relation::Series.def())
		.filter(series::Column::LibraryId.eq(library_id))
		.select_only()
		.column_as(tag::Column::Id, "tag_id")
		.column_as(tag::Column::Name, "name")
		.column_as(media_tag::Column::MediaId.count(), "count")
		.group_by(tag::Column::Id)
		.group_by(tag::Column::Name)
		.order_by_asc(tag::Column::Name)
		.into_model::<TagNameCount>()
		.all(conn)
		.await?;

	Ok(tag_counts
		.into_iter()
		.map(|row| LibraryTag {
			id: row.tag_id,
			name: row.name,
			count: row.count,
		})
		.collect())
}

#[Object]
impl TagQuery {
	/// Returns a list of all tags.
	async fn tags(&self, ctx: &Context<'_>) -> Result<Vec<Tag>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		get_tags(conn).await
	}

	/// Returns the tags associated with a library, along with the number of
	/// books in that library which have each tag applied.
	async fn library_tags(
		&self,
		ctx: &Context<'_>,
		library_id: ID,
	) -> Result<Vec<LibraryTag>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		get_library_tags(conn, &library_id).await
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use sea_orm::MockDatabase;

	#[tokio::test]
	async fn test_find_tags() {
		let mock_db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results(vec![vec![tag::Model {
				id: 123,
				name: "hello".to_string(),
			}]])
			.into_connection();

		let tags = get_tags(&mock_db).await.unwrap();

		assert_eq!(tags.len(), 1);
		assert_eq!(tags[0].model.id, 123);
		assert_eq!(tags[0].model.name, "hello");
	}

	#[tokio::test]
	async fn test_find_tags_no_tags() {
		let mock_db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results::<tag::Model, Vec<_>, Vec<Vec<_>>>(vec![vec![]])
			.into_connection();

		let tags = get_tags(&mock_db).await.unwrap();

		assert_eq!(tags.len(), 0);
	}

	#[tokio::test]
	async fn test_find_library_tags() {
		let mock_db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results(vec![vec![maplit::btreemap! {
				"tag_id" => Into::<sea_orm::Value>::into(123),
				"name" => Into::<sea_orm::Value>::into("hello"),
				"count" => Into::<sea_orm::Value>::into(5i64),
			}]])
			.into_connection();

		let tags = get_library_tags(&mock_db, "42").await.unwrap();

		assert_eq!(tags.len(), 1);
		assert_eq!(tags[0].id, 123);
		assert_eq!(tags[0].name, "hello");
		assert_eq!(tags[0].count, 5);
	}

	#[tokio::test]
	async fn test_find_library_tags_without_tagged_books() {
		let mock_db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results::<std::collections::BTreeMap<&str, sea_orm::Value>, Vec<_>, Vec<Vec<_>>>(
				vec![vec![]],
			)
			.into_connection();

		let tags = get_library_tags(&mock_db, "42").await.unwrap();
		assert_eq!(tags.len(), 0);
	}
}
