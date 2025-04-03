use crate::data::CoreContext;
use async_graphql::{Context, Object, Result};
use models::entity::media_metadata;
use sea_orm::DatabaseConnection;
use std::collections::BTreeSet;

static VALUE_SEPERATOR: char = ',';
fn make_unique(iter: impl Iterator<Item = String>) -> Vec<String> {
	BTreeSet::<String>::from_iter(iter)
		.into_iter()
		.filter(|s| !s.is_empty())
		.collect::<Vec<String>>()
}

fn list_str_to_vec(list: String) -> Vec<String> {
	list.split(VALUE_SEPERATOR)
		.map(|s| s.trim().to_string())
		.collect()
}

macro_rules! get_unique_values_inner {
	($column:ident, $conn:ident) => {{
		let values: Vec<String> =
			media_metadata::Entity::find_for_column(media_metadata::Column::$column)
				.into_tuple()
				.all($conn)
				.await?;
		Ok(make_unique(values.into_iter().flat_map(list_str_to_vec)))
	}};
}

#[derive(Default, Debug, Clone)]
pub struct MediaMetadataOverview {}

#[Object]
impl MediaMetadataOverview {
	async fn genres(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		let conn: &DatabaseConnection = ctx.data::<CoreContext>()?.conn.as_ref();
		get_unique_values_inner!(Genre, conn)
	}

	async fn writers(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		let conn: &DatabaseConnection = ctx.data::<CoreContext>()?.conn.as_ref();
		get_unique_values_inner!(Writers, conn)
	}

	async fn pencillers(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		let conn: &DatabaseConnection = ctx.data::<CoreContext>()?.conn.as_ref();
		get_unique_values_inner!(Pencillers, conn)
	}

	async fn inkers(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		let conn: &DatabaseConnection = ctx.data::<CoreContext>()?.conn.as_ref();
		get_unique_values_inner!(Inkers, conn)
	}

	async fn colorists(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		let conn: &DatabaseConnection = ctx.data::<CoreContext>()?.conn.as_ref();
		get_unique_values_inner!(Colorists, conn)
	}

	async fn letterers(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		let conn: &DatabaseConnection = ctx.data::<CoreContext>()?.conn.as_ref();
		get_unique_values_inner!(Letterers, conn)
	}

	async fn editors(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		let conn: &DatabaseConnection = ctx.data::<CoreContext>()?.conn.as_ref();
		get_unique_values_inner!(Editors, conn)
	}

	async fn publishers(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		let conn: &DatabaseConnection = ctx.data::<CoreContext>()?.conn.as_ref();
		get_unique_values_inner!(Publisher, conn)
	}

	async fn characters(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		let conn: &DatabaseConnection = ctx.data::<CoreContext>()?.conn.as_ref();
		get_unique_values_inner!(Characters, conn)
	}

	async fn teams(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		let conn: &DatabaseConnection = ctx.data::<CoreContext>()?.conn.as_ref();
		get_unique_values_inner!(Teams, conn)
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use sea_orm::{MockDatabase, Value};

	async fn get_unique_values_inner_test(
		conn: &DatabaseConnection,
	) -> Result<Vec<String>> {
		get_unique_values_inner!(Genre, conn)
	}

	#[tokio::test]
	async fn test_get_unique_values() {
		let mock_db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results([[maplit::btreemap! {
				"0" => Into::<Value>::into(vec!["a", "a", "c"].join(&VALUE_SEPERATOR.to_string())),
			}]])
			.into_connection();

		let mut genres = get_unique_values_inner_test(&mock_db).await.unwrap();
		genres.sort();
		assert_eq!(genres, vec!["a", "c"]);
	}

	#[tokio::test]
	async fn test_get_empty_values() {
		let mock_db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results([[maplit::btreemap! {
				"0" => Into::<Value>::into("".to_string()),
			}]])
			.into_connection();

		let genres = get_unique_values_inner_test(&mock_db).await.unwrap();
		assert!(genres.is_empty());
	}

	#[tokio::test]
	async fn test_empty_value_after_split() {
		let mock_db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results([[maplit::btreemap! {
				"0" => Into::<Value>::into(vec!["a", "", "c"].join(&VALUE_SEPERATOR.to_string())),
			}]])
			.into_connection();

		let mut genres = get_unique_values_inner_test(&mock_db).await.unwrap();
		genres.sort();
		assert_eq!(genres, vec!["a", "c"]);
	}
}
