use crate::data::CoreContext;
use async_graphql::{Context, Object, Result};
use models::entity::media_metadata;
use sea_orm::{prelude::*, QueryOrder, QuerySelect};
use std::collections::BTreeSet;

fn make_unique(iter: impl Iterator<Item = String>) -> Vec<String> {
	BTreeSet::<String>::from_iter(iter)
		.into_iter()
		.collect::<Vec<String>>()
}

fn list_str_to_vec(list: String) -> Vec<String> {
	list.split(',').map(|s| s.trim().to_string()).collect()
}

macro_rules! get_unique_values_inner {
	($column:ident, $ctx:ident) => {{
		let conn: &DatabaseConnection = $ctx.data::<CoreContext>()?.conn.as_ref();
		let values: Vec<String> = media_metadata::Entity::find()
			.select_only()
			.columns(vec![media_metadata::Column::$column])
			.filter(media_metadata::Column::$column.is_not_null())
			.order_by_asc(media_metadata::Column::$column)
			.distinct()
			.into_tuple()
			.all(conn)
			.await?;
		Ok(make_unique(values.into_iter().flat_map(list_str_to_vec)))
	}};
}

#[derive(Default, Debug, Clone)]
pub struct MediaMetadataOverview {}

#[Object]
impl MediaMetadataOverview {
	async fn genres(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		get_unique_values_inner!(Genre, ctx)
	}

	async fn writers(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		get_unique_values_inner!(Writers, ctx)
	}

	async fn pencillers(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		get_unique_values_inner!(Pencillers, ctx)
	}

	async fn inkers(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		get_unique_values_inner!(Inkers, ctx)
	}

	async fn colorists(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		get_unique_values_inner!(Colorists, ctx)
	}

	async fn letterers(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		get_unique_values_inner!(Letterers, ctx)
	}

	async fn editors(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		get_unique_values_inner!(Editors, ctx)
	}

	async fn publishers(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		get_unique_values_inner!(Publisher, ctx)
	}

	async fn characters(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		get_unique_values_inner!(Characters, ctx)
	}

	async fn teams(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		get_unique_values_inner!(Teams, ctx)
	}
}
