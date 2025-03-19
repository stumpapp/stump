use async_graphql::{EmptyMutation, EmptySubscription, Schema};
use query::Query;

mod mutation;
mod query;
mod schema;

pub type AppSchema = Schema<Query, EmptyMutation, EmptySubscription>;

pub use schema::build_schema;

// TODO: move graphql to its own crate?
