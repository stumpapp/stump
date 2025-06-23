mod api_key;
mod book_club;
mod config;
mod email_device;
mod emailer;
mod epub;
mod filesystem;
mod job;
mod library;
mod log;
pub(crate) mod media;
mod media_metadata_overview;
mod notifier;
pub(crate) mod reading_list;
mod series;
mod smart_list_view;
mod smart_lists;
pub(crate) mod smart_lists_builder;
mod tag;
pub(crate) mod user;

use api_key::APIKeyQuery;
use book_club::BookClubQuery;
use config::ConfigQuery;
use email_device::EmailDeviceQuery;
use emailer::EmailerQuery;
use epub::EpubQuery;
use filesystem::FilesystemQuery;
use library::LibraryQuery;
use log::LogQuery;
use media::MediaQuery;
use media_metadata_overview::MediaMetadataOverviewQuery;
use notifier::NotifierQuery;
use reading_list::ReadingListQuery;
use series::SeriesQuery;
use smart_list_view::SmartListViewQuery;
use smart_lists::SmartListsQuery;
use tag::TagQuery;
use user::UserQuery;

use crate::query::job::JobQuery;

#[derive(async_graphql::MergedObject, Default)]
pub struct Query(
	APIKeyQuery,
	BookClubQuery,
	EmailerQuery,
	EmailDeviceQuery,
	FilesystemQuery,
	JobQuery,
	MediaQuery,
	UserQuery,
	NotifierQuery,
	ReadingListQuery,
	EpubQuery,
	LibraryQuery,
	MediaMetadataOverviewQuery,
	SmartListViewQuery,
	SeriesQuery,
	TagQuery,
	LogQuery,
	ConfigQuery,
	SmartListsQuery,
);
