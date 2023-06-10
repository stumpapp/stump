use std::sync::Arc;

mod library_dao;
mod media_dao;
mod series_dao;

pub use library_dao::LibraryDAO;
pub use media_dao::MediaDAO;
pub use series_dao::*;

use crate::prisma::PrismaClient;

/// A utility trait for DAO implementations. Provides a generic structure for
/// interacting with Prisma.
#[async_trait::async_trait]
pub trait DAO: Sync + Sized {
	/// The entity type that this DAO interacts with.
	type Entity: Sync;

	// Creates a new DAO instance with the given Prisma client.
	fn new(client: Arc<PrismaClient>) -> Self;
}
