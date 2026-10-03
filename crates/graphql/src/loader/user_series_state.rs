use async_graphql::dataloader::Loader;
use models::entity::user_series_state;
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};
use std::{collections::HashMap, sync::Arc};

pub struct UserSeriesStateLoader {
	conn: Arc<DatabaseConnection>,
}

impl UserSeriesStateLoader {
	pub fn new(conn: Arc<DatabaseConnection>) -> Self {
		Self { conn }
	}
}

#[derive(Clone, PartialEq, Eq, Hash)]
pub struct UserSeriesStateLoaderKey {
	pub user_id: String,
	pub series_id: String,
}

impl Loader<UserSeriesStateLoaderKey> for UserSeriesStateLoader {
	type Value = user_series_state::Model;
	type Error = Arc<sea_orm::error::DbErr>;

	async fn load(
		&self,
		keys: &[UserSeriesStateLoaderKey],
	) -> Result<HashMap<UserSeriesStateLoaderKey, Self::Value>, Self::Error> {
		if keys.is_empty() {
			return Ok(HashMap::new());
		}

		let user_ids: Vec<String> = keys.iter().map(|k| k.user_id.clone()).collect();
		let series_ids: Vec<String> = keys.iter().map(|k| k.series_id.clone()).collect();

		let states = user_series_state::Entity::find()
			.filter(
				user_series_state::Column::UserId
					.is_in(user_ids)
					.and(user_series_state::Column::SeriesId.is_in(series_ids)),
			)
			.all(self.conn.as_ref())
			.await?;

		let result = states
			.into_iter()
			.map(|state| {
				(
					UserSeriesStateLoaderKey {
						user_id: state.user_id.clone(),
						series_id: state.series_id.clone(),
					},
					state,
				)
			})
			.collect::<HashMap<_, _>>();

		Ok(result)
	}
}
