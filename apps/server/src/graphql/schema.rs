use async_graphql::{EmptyMutation, EmptySubscription, Schema};

use crate::config::state::AppState;

use super::{query::Query, AppSchema};

pub async fn build_schema(state: AppState) -> AppSchema {
	Schema::build(Query::default(), EmptyMutation, EmptySubscription)
		.data(state)
		.finish()
}
