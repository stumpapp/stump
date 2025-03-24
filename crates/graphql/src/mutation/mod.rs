mod book_club;
mod epub;
mod library;
mod media;
mod reading_list;
mod series;

use book_club::BookClubMutation;
use epub::EpubMutation;
use library::LibraryMutation;
use reading_list::ReadingListMutation;
use series::SeriesMutation;

#[derive(async_graphql::MergedObject, Default)]
pub struct Mutation(
	BookClubMutation,
	EpubMutation,
	LibraryMutation,
	ReadingListMutation,
	SeriesMutation,
);
