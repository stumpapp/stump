mod book_club;
mod epub;
mod library;
mod log;
mod media;
mod reading_list;
mod series;
mod tag;
mod upload;

use book_club::BookClubMutation;
use epub::EpubMutation;
use library::LibraryMutation;
use log::LogMutation;
use reading_list::ReadingListMutation;
use series::SeriesMutation;
use tag::TagMutation;
use upload::UploadMutation;

#[derive(async_graphql::MergedObject, Default)]
pub struct Mutation(
	BookClubMutation,
	EpubMutation,
	LibraryMutation,
	LogMutation,
	ReadingListMutation,
	SeriesMutation,
	TagMutation,
	UploadMutation,
);
