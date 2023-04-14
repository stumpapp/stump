use std::sync::Arc;

mod media_dao;
mod series_dao;

pub use media_dao::*;
pub use series_dao::*;

use crate::{prelude::CoreResult, prisma::PrismaClient};

// TODO: once my dao impls are more complete, add some integration tests.

/// [`Dao`] trait defines the basic DB operations for a model. Update operations are not included since
/// they are more niche per model, and are not used in the generic way as the other operations.
#[async_trait::async_trait]
pub trait Dao: Sync + Sized {
	type Model: Sync;

	// Creates a new Dao instance.
	fn new(client: Arc<PrismaClient>) -> Self;
	/// Creates a new record in the database.
	async fn insert(&self, data: Self::Model) -> CoreResult<Self::Model>;
	/// Deletes a record from the database.
	async fn delete(&self, id: &str) -> CoreResult<Self::Model>;
	/// Finds a record by its id.
	async fn find_by_id(&self, id: &str) -> CoreResult<Self::Model>;
	/// Finds all records.
	async fn find_all(&self) -> CoreResult<Vec<Self::Model>>;
}

// TODO: look into put an patch operations, remove DaoUpdate and merge with Dao

/// [`DaoUpdate`] trait defines a single update operation for a model. This is a generic type signature
/// for the update operation, and since not all models really need this, it is contained in
/// a separate trait.
#[async_trait::async_trait]
pub trait DaoUpdate {
	type Model: Sync;

	/// Updates a record in the database.
	async fn update(&self, id: &str, data: Self::Model) -> CoreResult<Self::Model>;
	/// Updates a record in the database, or creates it if it does not exist.
	async fn upsert(&self, data: Self::Model) -> CoreResult<Self::Model>;

	// async fn update_many(&self, data: Vec<Self::Model>) -> CoreResult<Vec<Self::Model>>;
	// async fn patch_many(&self, data: Vec<Self::Model>) -> CoreResult<Vec<Self::Model>>;
}

#[async_trait::async_trait]
pub trait DaoBatch: Sync + Sized {
	type Model: Sync;

	/// Creates multiple new records in the database.
	async fn insert_many(&self, data: Vec<Self::Model>) -> CoreResult<Vec<Self::Model>>;

	// async fn _insert_batch<T: ::prisma_client_rust::BatchContainer<Marker>, Marker>(
	// 	&self,
	// 	queries: T,
	// ) -> CoreResult<Vec<Self::Model>>;

	// FIXME: maybe refactor to take something like IntoIterator<Item = Self::Model> ?
	async fn _insert_batch<T: Iterator<Item = Self::Model>>(
		&self,
		models: T,
	) -> CoreResult<Vec<Self::Model>>
	where
		T: Iterator<Item = Self::Model> + Send + Sync;

	// async fn _update_batch<T: ::prisma_client_rust::BatchContainer<Marker>, Marker>(
	// 	&self,
	// 	queries: T,
	// ) -> CoreResult<Vec<Self::Model>>;

	/// Deletes multiple records from the database. Returns the number of deleted records.
	async fn delete_many(&self, ids: Vec<String>) -> CoreResult<i64>;

	/// Deletes multiple records from the database. Returns the records that were deleted.
	async fn _delete_batch(&self, ids: Vec<String>) -> CoreResult<Vec<Self::Model>>;
}

#[async_trait::async_trait]
pub trait DaoCount: Sync + Sized {
	/// Counts the number of records in the database.
	async fn count_all(&self) -> CoreResult<i64>;
}

#[async_trait::async_trait]
pub trait DaoRestricted: Sync + Sized {
	type Model: Sync;

	/// Finds a record by its id, if the user has access to it.
	async fn find_by_id(&self, id: &str, user_id: &str) -> CoreResult<Self::Model>;

	/// Finds all records, if the user has access to them.
	async fn find_all(&self, user_id: &str) -> CoreResult<Vec<Self::Model>>;
}
