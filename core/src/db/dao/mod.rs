use std::sync::Arc;

mod series_dao;

pub use series_dao::*;

use crate::prisma::PrismaClient;

// TODO: remove DAO trait and entire crate, replace with utilities as needed. Much of this is only even used in the server, so the core does not need to hold it.

/// A utility trait for DAO implementations. Provides a generic structure for
/// interacting with Prisma.
#[async_trait::async_trait]
pub trait DAO: Sync + Sized {
	/// The entity type that this DAO interacts with.
	type Entity: Sync;

	// Creates a new DAO instance with the given Prisma client.
	fn new(client: Arc<PrismaClient>) -> Self;
}
