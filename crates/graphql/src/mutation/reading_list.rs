use async_graphql::{Context, Object, Result};
use models::entity::{reading_list, reading_list_item};
use sea_orm::{
	ActiveValue::Set,
	TransactionTrait,
	{prelude::*, DatabaseTransaction},
};

use crate::{
	data::{AuthContext, CoreContext},
	input::reading_list::ReadingListInput,
	object::reading_list::ReadingList,
};

#[derive(Default)]
pub struct ReadingListMutation;

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
		let user_id = ctx.data::<AuthContext>()?.id();

		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let txn = conn.begin().await?;
		let media_ids = input.media_ids.clone();
		let reading_list = create_reading_list_for_user_id(&user_id, input, &txn).await?;

		create_reading_list_items(reading_list.id.clone(), media_ids, &txn).await?;
		txn.commit().await?;

		Ok(ReadingList {
			model: reading_list,
		})
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
		let user_id = ctx.data::<AuthContext>()?.id();
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let reading_list_id = input.id.clone();

		let _ = get_for_owner(&reading_list_id, conn, user_id).await?;

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
		let user_id = ctx.data::<AuthContext>()?.id();
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let reading_list = get_for_owner(&id, conn, user_id).await?;

		// Delete reading list
		let _ = reading_list.clone().delete(conn).await?;

		Ok(ReadingList {
			model: reading_list,
		})
	}
}

async fn create_reading_list_for_user_id(
	user_id: &str,
	input: ReadingListInput,
	txn: &DatabaseTransaction,
) -> Result<reading_list::Model, DbErr> {
	input.into_active_model(user_id).insert(txn).await
}

async fn create_reading_list_items(
	reading_list_id: String,
	media_ids: Vec<String>,
	txn: &DatabaseTransaction,
) -> Result<Vec<reading_list_item::Model>, DbErr> {
	let item_creates = media_ids
		.iter()
		.enumerate()
		.map(|(idx, media_id)| reading_list_item::ActiveModel {
			display_order: Set(idx as i32),
			media_id: Set(media_id.clone()),
			reading_list_id: Set(reading_list_id.clone()),
			..Default::default()
		})
		.collect::<Vec<_>>();

	reading_list_item::Entity::insert_many(item_creates)
		.exec_with_returning_many(txn)
		.await
}

async fn get_for_owner(
	id: &str,
	conn: &DbConn,
	user_id: String,
) -> Result<reading_list::Model> {
	// Check if reading list exists
	let reading_list = reading_list::Entity::find()
		.filter(reading_list::Column::Id.eq(id.to_owned()))
		.one(conn)
		.await?
		.ok_or("Reading list not found")?;

	if reading_list.creating_user_id != user_id {
		// TODO: log bad access attempt to DB
		return Err("You do not have permission to access this resource."
			.to_string()
			.into());
	}

	Ok(reading_list)
}

#[cfg(test)]
mod tests {
	use super::*;
	use models::shared::enums::EntityVisibility;
	use sea_orm::MockDatabase;

	fn get_reading_list_test_object() -> reading_list::Model {
		reading_list::Model {
			id: "123".to_string(),
			name: "hello".to_string(),
			visibility: "PUBLIC".to_string(),
			creating_user_id: "42".to_string(),
			description: None,
			updated_at: "2021-08-01T00:00:00Z".parse().unwrap(),
			ordering: "MANUAL".to_string(),
		}
	}

	#[tokio::test]
	async fn test_get_for_owner() {
		let mock_db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results(vec![vec![get_reading_list_test_object()]])
			.into_connection();

		let reading_list = get_for_owner("123", &mock_db, "42".to_string())
			.await
			.unwrap();

		assert_eq!(reading_list, get_reading_list_test_object());
	}

	#[tokio::test]
	async fn test_get_for_not_owner() {
		let mut test_model = get_reading_list_test_object();
		test_model.creating_user_id = "123".to_string();
		let mock_db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results(vec![vec![test_model]])
			.into_connection();

		let result = get_for_owner("123", &mock_db, "user".to_string()).await;

		assert!(result.is_err());
	}

	#[tokio::test]
	async fn test_create_reading_list() {
		let mock_db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results(vec![vec![get_reading_list_test_object()]])
			.into_connection();

		let user_id = "42".to_string();
		let input = ReadingListInput {
			id: "123".to_string(),
			name: "hello".to_string(),
			visibility: Some(EntityVisibility::Public),
			media_ids: vec!["1".to_string(), "2".to_string()],
		};

		let txn = mock_db.begin().await.unwrap();
		let result = create_reading_list_for_user_id(&user_id, input, &txn)
			.await
			.unwrap();

		assert_eq!(result, get_reading_list_test_object());
	}

	#[tokio::test]
	async fn test_create_reading_list_items() {
		let mock_db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results(vec![vec![reading_list_item::Model {
				id: 1,
				reading_list_id: "123".to_string(),
				media_id: "1".to_string(),
				display_order: 0,
			}]])
			.into_connection();

		let txn = mock_db.begin().await.unwrap();
		let media_ids = vec!["a".to_string(), "b".to_string()];
		let result = create_reading_list_items("1".to_string(), media_ids, &txn)
			.await
			.unwrap();

		assert_eq!(
			result,
			vec![reading_list_item::Model {
				id: 1,
				reading_list_id: "123".to_string(),
				media_id: "1".to_string(),
				display_order: 0,
			}]
		);
	}
}
