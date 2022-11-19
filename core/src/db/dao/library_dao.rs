use std::sync::Arc;

use crate::{
	db::models::Library,
	prelude::{CoreError, CoreResult},
	prisma::{library, library_options, PrismaClient},
};

use super::{Dao, LibraryOptionsDaoImpl};

pub struct LibraryDaoImpl {
	client: Arc<PrismaClient>,
}

#[async_trait::async_trait]
impl Dao for LibraryDaoImpl {
	type Model = Library;

	fn new(client: Arc<PrismaClient>) -> Self {
		Self { client }
	}

	async fn insert(&self, data: Self::Model) -> CoreResult<Self::Model> {
		let library_options_dao = LibraryOptionsDaoImpl::new(self.client.clone());
		let library_options = library_options_dao.insert(data.library_options).await?;

		let created_library = self
			.client
			.library()
			.create(
				data.name,
				data.path,
				library_options::id::equals(library_options.id.unwrap()),
				vec![],
			)
			.with(library::library_options::fetch())
			.exec()
			.await?;

		Ok(Library::from(created_library))
	}

	async fn delete(&self, id: &str) -> CoreResult<Self::Model> {
		let deleted_library = self
			.client
			.library()
			.delete(library::id::equals(id.to_string()))
			.exec()
			.await?;

		Ok(Library::from(deleted_library))
	}

	async fn find_by_id(&self, id: &str) -> CoreResult<Self::Model> {
		let library = self
			.client
			.library()
			.find_unique(library::id::equals(id.to_string()))
			.with(library::library_options::fetch())
			.exec()
			.await?;

		if library.is_none() {
			return Err(CoreError::NotFound(format!(
				"Library with id {} not found",
				id
			)));
		}

		Ok(Library::from(library.unwrap()))
	}

	async fn find_all(&self) -> CoreResult<Vec<Self::Model>> {
		let libraries = self.client.library().find_many(vec![]).exec().await?;

		Ok(libraries.into_iter().map(Library::from).collect())
	}
}
