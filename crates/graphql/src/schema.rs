use crate::{
	data::CoreContext,
	loader::{
		favorite::FavoritesLoader, library::LibraryLoader, log::JobAssociatedLogLoader,
		media::MediaLoader, reading_session::ReadingSessionLoader, series::SeriesLoader,
		series_count::SeriesCountLoader,
		series_finished_count::SeriesFinishedCountLoader,
	},
	mutation::Mutation,
	query::Query,
	subscription::Subscription,
};
use async_graphql::{dataloader::DataLoader, ObjectType, Schema, SchemaBuilder};
use models::shared::enums::AccessRole;
use sea_orm::DatabaseConnection;
use std::sync::Arc;

pub type AppSchema = Schema<Query, Mutation, Subscription>;

pub async fn build_schema(ctx: CoreContext) -> AppSchema {
	let conn = ctx.conn.clone();
	let schema_builder = Schema::build(
		Query::default(),
		Mutation::default(),
		Subscription::default(),
	)
	// AccessRole is used in a serialized json for SmartList so we need to register it manually
	.register_output_type::<AccessRole>()
	.data(ctx);

	add_data_loaders(schema_builder, conn).finish()
}

pub fn add_data_loaders<
	QueryType: ObjectType + 'static,
	MutationType: ObjectType + 'static,
	SubscriptionType: 'static,
>(
	schema: SchemaBuilder<QueryType, MutationType, SubscriptionType>,
	conn: Arc<DatabaseConnection>,
) -> SchemaBuilder<QueryType, MutationType, SubscriptionType> {
	schema
		.data(DataLoader::new(
			JobAssociatedLogLoader::new(conn.clone()),
			tokio::spawn,
		))
		.data(DataLoader::new(
			ReadingSessionLoader::new(conn.clone()),
			tokio::spawn,
		))
		.data(DataLoader::new(
			MediaLoader::new(conn.clone()),
			tokio::spawn,
		))
		.data(DataLoader::new(
			LibraryLoader::new(conn.clone()),
			tokio::spawn,
		))
		.data(DataLoader::new(
			SeriesLoader::new(conn.clone()),
			tokio::spawn,
		))
		.data(DataLoader::new(
			SeriesCountLoader::new(conn.clone()),
			tokio::spawn,
		))
		.data(DataLoader::new(
			SeriesFinishedCountLoader::new(conn.clone()),
			tokio::spawn,
		))
		.data(DataLoader::new(
			FavoritesLoader::new(conn.clone()),
			tokio::spawn,
		))
}

pub fn build_schema_bare() -> AppSchema {
	Schema::build(
		Query::default(),
		Mutation::default(),
		Subscription::default(),
	)
	// AccessRole is used in a serialized json for SmartList so we need to register it manually
	.register_output_type::<AccessRole>()
	.finish()
}
