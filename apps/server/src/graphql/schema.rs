use async_graphql::{EmptySubscription, Schema};

use crate::config::state::AppState;

use super::{mutation::Mutation, query::Query, AppSchema};

pub async fn build_schema(state: AppState) -> AppSchema {
	Schema::build(Query::default(), Mutation::default(), EmptySubscription)
		.data(state)
		.finish()
}
