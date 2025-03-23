mod library;

use library::LibraryMutation;

#[derive(async_graphql::MergedObject, Default)]
pub struct Mutation(LibraryMutation);
