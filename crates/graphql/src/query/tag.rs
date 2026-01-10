use crate::{data::CoreContext, object::tag::Tag};
use async_graphql::{Context, Object, Result};
use models::entity::tag;
use sea_orm::prelude::*;

#[derive(Default)]
pub struct TagQuery;

async fn get_tags(conn: &DatabaseConnection) -> Result<Vec<Tag>> {
	let query = tag::Entity::find()
		.into_model::<tag::Model>()
		.all(conn)
		.await?;

	Ok(query.into_iter().map(Tag::from).collect())
}

#[Object]
impl TagQuery {
	/// Returns a list of all tags.
	async fn tags(&self, ctx: &Context<'_>) -> Result<Vec<Tag>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		get_tags(conn).await
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
}
