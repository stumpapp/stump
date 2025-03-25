mod book_club;
mod epub;
pub(crate) mod media;
mod media_metadata_overview;
pub(crate) mod reading_list;
mod tag;
pub(crate) mod user;

use epub::EpubQuery;
use media::MediaQuery;
use media_metadata_overview::MediaMetadataOverviewQuery;
use reading_list::ReadingListQuery;
use tag::TagQuery;
use user::UserQuery;

#[derive(async_graphql::MergedObject, Default)]
pub struct Query(
	MediaQuery,
	UserQuery,
	ReadingListQuery,
	EpubQuery,
	MediaMetadataOverviewQuery,
	TagQuery,
);
