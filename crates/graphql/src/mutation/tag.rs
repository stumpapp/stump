use crate::{data::CoreContext, object::tag::Tag};
use async_graphql::{Context, Object, Result};
use models::entity::tag;
use sea_orm::{
	prelude::*, ActiveValue::Set, DatabaseConnection, DatabaseTransaction, QuerySelect,
	TransactionTrait,
};
use std::collections::HashSet;

#[derive(Default)]
pub struct TagMutation;

#[Object]
impl TagMutation {
	/// Returns a list containing the newly created tags, or an error if creation failed.
	///
	/// If any of the tags already exist an error is returned.
	///
	/// * `tags` - A non-empty list of tags to create.
	async fn create_tags(
		&self,
		ctx: &Context<'_>,
		tags: Vec<String>,
	) -> Result<Vec<Tag>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		create_tags(conn, tags).await
	}

	/// Delete tags. Returns a list containing the deleted tags, or an error if deletion failed.
	///
	/// * `tags` - A non-empty list of tags to create.
	async fn delete_tags(
		&self,
		ctx: &Context<'_>,
		tags: Vec<String>,
	) -> Result<Vec<Tag>> {
		if tags.is_empty() {
			return Err("No tags provided".into());
		}

		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let deleted_tags = tag::Entity::delete_many()
			.filter(tag::Column::Name.is_in(tags.clone()))
			.exec_with_returning(conn)
			.await?;

		Ok(deleted_tags.into_iter().map(Tag::from).collect())
	}
}

async fn get_unique_tags(
	txn: &DatabaseTransaction,
	tags: Vec<String>,
) -> Result<Vec<String>> {
	if tags.is_empty() {
		return Err("No tags provided".into());
	}

	let unique_tags: Vec<String> = tags
		.into_iter()
		.collect::<HashSet<_>>()
		.into_iter()
		.collect();

	let existing_tags: Vec<String> = tag::Entity::find()
		.select_only()
		.columns(vec![tag::Column::Name])
		.filter(tag::Column::Name.is_in(unique_tags.clone()))
		.into_tuple()
		.all(txn)
		.await?;

	if !existing_tags.is_empty() {
		return Err(format!("Tags already exist: {:?}", existing_tags).into());
	}

	Ok(unique_tags)
}

async fn insert_tags(
	txn: &DatabaseTransaction,
	tags: Vec<String>,
) -> Result<Vec<tag::Model>, DbErr> {
	let new_tag_models = tags
		.iter()
		.map(|t| tag::ActiveModel {
			name: Set(t.clone()),
			..Default::default()
		})
		.collect::<Vec<tag::ActiveModel>>();

	tag::Entity::insert_many(new_tag_models)
		.exec_with_returning_many(txn)
		.await
}

async fn create_tags(conn: &DatabaseConnection, tags: Vec<String>) -> Result<Vec<Tag>> {
	let txn = conn.begin().await?;
	let unique_tags = get_unique_tags(&txn, tags).await?;
	let inserted_tags = insert_tags(&txn, unique_tags).await?;

	txn.commit().await?;

	Ok(inserted_tags.into_iter().map(Tag::from).collect())
}

#[cfg(test)]
mod tests {
	use super::*;
	use sea_orm::{MockDatabase, MockExecResult};

	#[tokio::test]
	async fn test_insert() {
		let tag_models = vec![
			tag::Model {
				id: 123,
				name: "hello".to_string(),
			},
			tag::Model {
				id: 321,
				name: "world".to_string(),
			},
		];
		let conn = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results(vec![vec![], tag_models.clone()])
			.append_exec_results(vec![MockExecResult {
				last_insert_id: 1,
				rows_affected: 2,
			}])
			.into_connection();

		let tags = vec!["hello".to_string(), "world".to_string()];
		let mut inserted_tags = create_tags(&conn, tags).await.unwrap();
		inserted_tags.sort();
		assert_eq!(
			inserted_tags,
			vec![
				Tag {
					model: tag_models[0].clone()
				},
				Tag {
					model: tag_models[1].clone()
				}
			]
		);
	}

	#[tokio::test]
	async fn test_find_tags() {
		let mock_db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results::<tag::Model, Vec<_>, Vec<Vec<_>>>(vec![vec![]])
			.into_connection();
		let txn = mock_db.begin().await.unwrap();

		let tags = vec!["hello".to_string(), "world".to_string()];
		let mut unique_tags = get_unique_tags(&txn, tags).await.unwrap();
		unique_tags.sort();
		assert_eq!(unique_tags, vec!["hello".to_string(), "world".to_string()]);
	}

	#[tokio::test]
	async fn test_find_tags_existing() {
		let tag_models = vec![
			tag::Model {
				id: 123,
				name: "hello".to_string(),
			},
			tag::Model {
				id: 321,
				name: "world".to_string(),
			},
		];

		let mock_db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results::<tag::Model, Vec<_>, Vec<Vec<_>>>(vec![
				tag_models.clone()
			])
			.into_connection();
		let txn = mock_db.begin().await.unwrap();

		let tags = tag_models
			.iter()
			.map(|t| t.name.clone())
			.collect::<Vec<String>>();
		let unique_tags = get_unique_tags(&txn, tags).await;
		assert!(unique_tags.is_err());
	}

	#[tokio::test]
	async fn test_find_tags_duplicate() {
		let mock_db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results::<tag::Model, Vec<_>, Vec<Vec<_>>>(vec![vec![]])
			.into_connection();
		let txn = mock_db.begin().await.unwrap();

		let tags = vec!["hello".to_string(), "hello".to_string()];
		let unique_tags = get_unique_tags(&txn, tags).await.unwrap();
		assert_eq!(unique_tags, vec!["hello".to_string()]);
	}
}
