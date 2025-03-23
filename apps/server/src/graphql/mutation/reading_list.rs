use async_graphql::{Context, Enum, InputObject, Object, Result};
use graphql::{
	data::{CoreContext, RequestContext},
	object::reading_list::ReadingList,
};
use models::entity::reading_list;
use models::entity::reading_list_item;
use sea_orm::prelude::*;
use sea_orm::ActiveValue::Set;
use sea_orm::TransactionTrait;

#[derive(Default)]
pub struct ReadingListMutation;

#[derive(Default, Debug, Copy, Clone, Eq, PartialEq, Enum)]
enum Visibility {
	Public,
	#[default]
	Private,
	Shared,
}

impl std::fmt::Display for Visibility {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		write!(f, "{:?}", self)
	}
}

#[derive(InputObject)]
struct ReadingListInput {
	id: String,
	name: String,
	visibility: Option<Visibility>,
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

		// check if reading list exists
		let reading_list = reading_list::Entity::find()
			.filter(reading_list::Column::Id.eq(reading_list_id.clone()))
			.one(conn)
			.await?
			.ok_or_else(|| "Reading list not found")?;

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

		// check if reading list exists
		let reading_list = reading_list::Entity::find()
			.filter(reading_list::Column::Id.eq(id.clone()))
			.one(conn)
			.await?
			.ok_or_else(|| "Reading list not found")?;

		if reading_list.creating_user_id != user_id {
			// TODO: log bad access attempt to DB
			return Err("You do not have permission to access this resource."
				.to_string()
				.into());
		}

		// delete reading list
		let _ = reading_list.clone().delete(conn).await?;

		Ok(ReadingList {
			model: reading_list,
		})
	}
}
