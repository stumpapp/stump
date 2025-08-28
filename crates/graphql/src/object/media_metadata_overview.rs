use crate::data::CoreContext;
use async_graphql::{Context, Object, Result};
use models::entity::{media, media_metadata};
use sea_orm::{prelude::*, DatabaseConnection, QuerySelect, Select};
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

fn get_base_query(
	column: media_metadata::Column,
	series_id: Option<String>,
) -> Select<media_metadata::Entity> {
	let query = media_metadata::Entity::find_for_column(column);

	if let Some(series_id) = series_id {
		query
			.join_rev(
				sea_orm::JoinType::InnerJoin,
				media::Entity::belongs_to(media_metadata::Entity)
					.from(models::entity::media::Column::Id)
					.to(models::entity::media_metadata::Column::MediaId)
					.into(),
			)
			.filter(media::Column::SeriesId.eq(series_id))
	} else {
		query
	}
}

macro_rules! get_unique_values_inner {
	($column:ident, $conn:ident, $series_id:ident) => {{
		let query = get_base_query(media_metadata::Column::$column, $series_id);
		let values: Vec<String> = query.into_tuple().all($conn).await?;
		Ok(make_unique(values.into_iter().flat_map(list_str_to_vec)))
	}};
}

#[derive(Default, Debug, Clone)]
pub struct MediaMetadataOverview {
	pub series_id: Option<String>,
}

#[Object]
impl MediaMetadataOverview {
	async fn genres(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		let conn: &DatabaseConnection = ctx.data::<CoreContext>()?.conn.as_ref();
		let series_id = self.series_id.clone();
		get_unique_values_inner!(Genres, conn, series_id)
	}

	async fn writers(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		let conn: &DatabaseConnection = ctx.data::<CoreContext>()?.conn.as_ref();
		let series_id = self.series_id.clone();
		get_unique_values_inner!(Writers, conn, series_id)
	}

	async fn pencillers(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		let conn: &DatabaseConnection = ctx.data::<CoreContext>()?.conn.as_ref();
		let series_id = self.series_id.clone();
		get_unique_values_inner!(Pencillers, conn, series_id)
	}

	async fn inkers(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		let conn: &DatabaseConnection = ctx.data::<CoreContext>()?.conn.as_ref();
		let series_id = self.series_id.clone();
		get_unique_values_inner!(Inkers, conn, series_id)
	}

	async fn colorists(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		let conn: &DatabaseConnection = ctx.data::<CoreContext>()?.conn.as_ref();
		let series_id = self.series_id.clone();
		get_unique_values_inner!(Colorists, conn, series_id)
	}

	async fn letterers(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		let conn: &DatabaseConnection = ctx.data::<CoreContext>()?.conn.as_ref();
		let series_id = self.series_id.clone();
		get_unique_values_inner!(Letterers, conn, series_id)
	}

	async fn editors(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		let conn: &DatabaseConnection = ctx.data::<CoreContext>()?.conn.as_ref();
		let series_id = self.series_id.clone();
		get_unique_values_inner!(Editors, conn, series_id)
	}

	async fn publishers(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		let conn: &DatabaseConnection = ctx.data::<CoreContext>()?.conn.as_ref();
		let series_id = self.series_id.clone();
		let values: Vec<String> =
			get_base_query(media_metadata::Column::Publisher, series_id)
				.into_tuple()
				.all(conn)
				.await?;
		Ok(values)
	}

	async fn characters(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		let conn: &DatabaseConnection = ctx.data::<CoreContext>()?.conn.as_ref();
		let series_id = self.series_id.clone();
		get_unique_values_inner!(Characters, conn, series_id)
	}

	async fn teams(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		let conn: &DatabaseConnection = ctx.data::<CoreContext>()?.conn.as_ref();
		let series_id = self.series_id.clone();
		get_unique_values_inner!(Teams, conn, series_id)
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use sea_orm::{sea_query::SqliteQueryBuilder, MockDatabase, QueryTrait, Value};

	async fn get_unique_values_inner_test(
		conn: &DatabaseConnection,
	) -> Result<Vec<String>> {
		get_unique_values_inner!(Genres, conn, None)
	}

	#[test]
	fn get_base_query_test() {
		let series_id = Some("test_series".to_string());
		let query = get_base_query(media_metadata::Column::Genres, series_id);
		assert_eq!(
			query.to_owned().into_query().to_string(SqliteQueryBuilder),
			r#"SELECT DISTINCT "media_metadata"."genres" FROM "media_metadata" "#
				.to_string() + r#"INNER JOIN "media" ON "media"."id" = "media_metadata"."media_id" "#
				+ r#"WHERE "media_metadata"."genres" IS NOT NULL AND "media"."series_id" = 'test_series' "#
				+ r#"ORDER BY "media_metadata"."genres" ASC"#
		);
	}

	#[tokio::test]
	async fn test_get_unique_values() {
		let mock_db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
			.append_query_results([[maplit::btreemap! {
				"0" => Into::<Value>::into(["a", "a", "c"].join(&VALUE_SEPERATOR.to_string())),
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
				"0" => Into::<Value>::into(["a", "", "c"].join(&VALUE_SEPERATOR.to_string())),
			}]])
			.into_connection();

		let mut genres = get_unique_values_inner_test(&mock_db).await.unwrap();
		genres.sort();
		assert_eq!(genres, vec!["a", "c"]);
	}
}
