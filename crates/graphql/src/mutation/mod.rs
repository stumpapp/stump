mod library;
mod media;
mod reading_list;
mod series;

use library::LibraryMutation;
use reading_list::ReadingListMutation;
use series::SeriesMutation;

#[derive(async_graphql::MergedObject, Default)]
pub struct Mutation(LibraryMutation, SeriesMutation, ReadingListMutation);
