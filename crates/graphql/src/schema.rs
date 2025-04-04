use crate::{
	data::CoreContext,
	loader::{
		library::LibraryLoader, reading_session::ReadingSessionLoader,
		series::SeriesLoader,
	},
	mutation::Mutation,
	query::Query,
	subscription::Subscription,
};
use async_graphql::{dataloader::DataLoader, Schema};

pub type AppSchema = Schema<Query, Mutation, Subscription>;

pub async fn build_schema(ctx: CoreContext) -> AppSchema {
	let conn = ctx.conn.clone();
	Schema::build(
		Query::default(),
		Mutation::default(),
		Subscription::default(),
	)
	.data(ctx)
	.data(DataLoader::new(
		ReadingSessionLoader::new(conn.clone()),
		tokio::spawn,
	))
	.data(DataLoader::new(
		LibraryLoader::new(conn.clone()),
		tokio::spawn,
	))
	.data(DataLoader::new(SeriesLoader::new(conn), tokio::spawn))
	.finish()
}
