use async_graphql::{EmptyMutation, EmptySubscription, Schema};
use query::Query;

mod mutation;
mod object;
mod query;
mod schema;
mod state;

pub type AppSchema = Schema<Query, EmptyMutation, EmptySubscription>;

pub use schema::build_schema;
pub use state::GraphQLData;

// TODO: move graphql to its own crate?
