use crate::{data::CoreContext, mutation::Mutation, query::Query};
use async_graphql::{EmptySubscription, Schema};

pub type AppSchema = Schema<Query, Mutation, EmptySubscription>;

pub async fn build_schema(ctx: CoreContext) -> AppSchema {
	Schema::build(
		Query::default(),
		Mutation::default(),
		// Subscription::default(),
		EmptySubscription::default(),
	)
	.data(ctx)
	.finish()
}
