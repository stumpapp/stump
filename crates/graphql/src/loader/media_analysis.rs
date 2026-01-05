use std::{collections::HashMap, sync::Arc};

use async_graphql::dataloader::Loader;
use models::{entity::media_analysis, shared::analysis::PageDimension};
use sea_orm::{prelude::*, DatabaseConnection};

pub struct MediaAnalysisLoader {
	conn: Arc<DatabaseConnection>,
}

impl MediaAnalysisLoader {
	pub fn new(conn: Arc<DatabaseConnection>) -> Self {
		Self { conn }
	}
}

#[derive(Clone, PartialEq, Eq, Hash)]
pub struct PageDimensionLoaderKey {
	pub media_id: String,
}

impl Loader<PageDimensionLoaderKey> for MediaAnalysisLoader {
	type Value = PageDimension;
	type Error = Arc<sea_orm::error::DbErr>;

	async fn load(
		&self,
		keys: &[PageDimensionLoaderKey],
	) -> Result<HashMap<PageDimensionLoaderKey, Self::Value>, Self::Error> {
		let analysis_records = media_analysis::Entity::find()
			.filter(
				media_analysis::Column::MediaId.is_in(
					keys.iter()
						.map(|key| key.media_id.clone())
						.collect::<Vec<_>>(),
				),
			)
			.all(self.conn.as_ref())
			.await?;

		let mut result = HashMap::new();

		for key in keys {
			let dimension = analysis_records
				.iter()
				.find(|a| a.media_id == key.media_id)
				.and_then(|a| a.data.dimensions.first().cloned());

			if let Some(dimension) = dimension {
				result.insert(key.clone(), dimension);
			}
		}

		Ok(result)
	}
}
