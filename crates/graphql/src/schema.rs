use crate::{
	data::CoreContext, mutation::Mutation, query::Query, subscription::Subscription,
};
use async_graphql::Schema;

pub type AppSchema = Schema<Query, Mutation, Subscription>;

pub async fn build_schema(ctx: CoreContext) -> AppSchema {
	Schema::build(
		Query::default(),
		Mutation::default(),
		Subscription::default(),
	)
	.data(ctx)
	.finish()
}
