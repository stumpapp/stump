mod book_club;
mod emailer;
mod epub;
mod filesystem;
mod log;
pub(crate) mod media;
mod media_metadata_overview;
pub(crate) mod reading_list;
mod tag;
pub(crate) mod user;

use book_club::BookClubQuery;
use emailer::EmailerQuery;
use epub::EpubQuery;
use log::LogQuery;
use media::MediaQuery;
use media_metadata_overview::MediaMetadataOverviewQuery;
use reading_list::ReadingListQuery;
use tag::TagQuery;
use user::UserQuery;

#[derive(async_graphql::MergedObject, Default)]
pub struct Query(
	BookClubQuery,
	EmailerQuery,
	MediaQuery,
	UserQuery,
	ReadingListQuery,
	EpubQuery,
	MediaMetadataOverviewQuery,
	TagQuery,
	LogQuery,
);
