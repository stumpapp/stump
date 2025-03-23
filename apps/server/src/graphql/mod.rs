use async_graphql::{EmptySubscription, Schema};
use mutation::Mutation;
use query::Query;

mod mutation;
mod query;
mod schema;

pub type AppSchema = Schema<Query, Mutation, EmptySubscription>;

pub use schema::build_schema;

// TODO: move graphql to its own crate?
