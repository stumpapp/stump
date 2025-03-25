use crate::{data::CoreContext, object::tag::Tag};
use async_graphql::{Context, Object, Result};
use models::entity::tag;
use sea_orm::{prelude::*, ActiveValue::Set, QuerySelect, TransactionTrait};
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
		if tags.is_empty() {
			return Err("No tags provided".into());
		}

		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let unique_tags: Vec<String> = tags
			.into_iter()
			.collect::<HashSet<_>>()
			.into_iter()
			.collect();

		let txn = conn.begin().await?;
		let existing_tags: Vec<String> = tag::Entity::find()
			.select_only()
			.columns(vec![tag::Column::Name])
			.filter(tag::Column::Name.is_in(unique_tags.clone()))
			.into_tuple()
			.all(&txn)
			.await?;

		if !existing_tags.is_empty() {
			txn.commit().await?;
			return Err(format!("Tags already exist: {:?}", existing_tags).into());
		}

		let new_tag_models = unique_tags
			.iter()
			.map(|t| tag::ActiveModel {
				id: Set(Uuid::new_v4().to_string()),
				name: Set(t.clone()),
			})
			.collect::<Vec<tag::ActiveModel>>();

		let inserted_tags = tag::Entity::insert_many(new_tag_models)
			.exec_with_returning_many(&txn)
			.await?;

		txn.commit().await?;

		Ok(inserted_tags.into_iter().map(Tag::from).collect())
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
