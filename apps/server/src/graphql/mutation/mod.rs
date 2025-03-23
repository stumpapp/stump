mod library;
mod reading_list;

use library::LibraryMutation;
use reading_list::ReadingListMutation;

#[derive(async_graphql::MergedObject, Default)]
pub struct Mutation(LibraryMutation, ReadingListMutation);
