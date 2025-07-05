use crate::{
	data::CoreContext,
	loader::{
		library::LibraryLoader, log::JobAssociatedLogLoader,
		reading_session::ReadingSessionLoader, series::SeriesLoader,
	},
	mutation::Mutation,
	query::Query,
	subscription::Subscription,
};
use async_graphql::{dataloader::DataLoader, ObjectType, Schema, SchemaBuilder};
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
			LibraryLoader::new(conn.clone()),
			tokio::spawn,
		))
		.data(DataLoader::new(SeriesLoader::new(conn), tokio::spawn))
}

pub fn build_schema_bare() -> AppSchema {
	Schema::build(
		Query::default(),
		Mutation::default(),
		Subscription::default(),
	)
	.finish()
}
