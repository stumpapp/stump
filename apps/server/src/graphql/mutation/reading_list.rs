use async_graphql::{Context, InputObject, Object, Result};
use graphql::{
	data::{CoreContext, RequestContext},
	object::reading_list::ReadingList,
};
use models::entity::reading_list_item;
use models::{entity::reading_list, shared::enums::EntityVisibility};
use sea_orm::prelude::*;
use sea_orm::ActiveValue::Set;
use sea_orm::TransactionTrait;

#[derive(Default)]
pub struct ReadingListMutation;

#[derive(InputObject)]
struct ReadingListInput {
	id: String,
	name: String,
	visibility: Option<EntityVisibility>,
	media_ids: Vec<String>,
}

#[Object]
impl ReadingListMutation {
	/// Creates a new reading list.
	///
	/// # Returns
	///
	/// A result containing the newly created reading list, or an error if creation failed.
	async fn create_reading_list(
		&self,
		ctx: &Context<'_>,
		input: ReadingListInput,
	) -> Result<ReadingList> {
		let user_id = ctx.data::<RequestContext>()?.id();
		let now = chrono::Utc::now().into();

		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		Ok(conn
			.transaction::<_, ReadingList, DbErr>(|txn| {
				Box::pin(async move {
					let reading_list = reading_list::ActiveModel {
						id: Set(input.id.clone()),
						name: Set(input.name),
						updated_at: Set(now),
						visibility: Set(input
							.visibility
							.unwrap_or_default()
							.to_string()
							.to_uppercase()),
						creating_user_id: Set(user_id.clone()),
						..Default::default()
					}
					.insert(txn)
					.await?;

					let item_creates =
						input.media_ids.iter().enumerate().map(|(idx, media_id)| {
							reading_list_item::ActiveModel {
								id: Set(idx as i32),
								display_order: Set(idx as i32),
								media_id: Set(media_id.clone()),
								reading_list_id: Set(reading_list.id.clone()),
							}
							.insert(txn)
						});

					for item_create in item_creates {
						let _ = item_create.await?;
					}

					Ok(ReadingList {
						model: reading_list,
					})
				})
			})
			.await?)
	}

	/// Updates an existing reading list.
	///
	/// # Returns
	///
	/// A result containing the updated reading list, or an error if update failed.
	async fn update_reading_list(
		&self,
		ctx: &Context<'_>,
		input: ReadingListInput,
	) -> Result<ReadingList> {
		let user_id = ctx.data::<RequestContext>()?.id();
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let reading_list_id = input.id.clone();

		// Check if reading list exists
		let reading_list = reading_list::Entity::find()
			.filter(reading_list::Column::Id.eq(reading_list_id.clone()))
			.one(conn)
			.await?
			.ok_or("Reading list not found")?;

		if reading_list.creating_user_id != user_id {
			// TODO: log bad access attempt to DB
			return Err("You do not have permission to access this resource."
				.to_string()
				.into());
		}

		Err("Not implemented".to_string().into())
	}

	/// Deletes a reading list by ID.
	///
	/// # Returns
	///
	/// A result containing the deleted reading list, or an error if deletion failed.
	async fn delete_reading_list(
		&self,
		ctx: &Context<'_>,
		id: String,
	) -> Result<ReadingList> {
		let user_id = ctx.data::<RequestContext>()?.id();
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		// Check if reading list exists
		let reading_list = reading_list::Entity::find()
			.filter(reading_list::Column::Id.eq(id.clone()))
			.one(conn)
			.await?
			.ok_or("Reading list not found")?;

		if reading_list.creating_user_id != user_id {
			// TODO: log bad access attempt to DB
			return Err("You do not have permission to access this resource."
				.to_string()
				.into());
		}

		// Delete reading list
		let _ = reading_list.clone().delete(conn).await?;

		Ok(ReadingList {
			model: reading_list,
		})
	}
}
