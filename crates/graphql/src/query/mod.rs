mod api_key;
mod book_club;
mod book_club_book;
mod book_club_discussion;
mod book_club_invitation;
mod book_club_suggestion;
mod config;
mod custom_emoji;
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
mod server_config;
mod smart_list_view;
mod smart_lists;
pub(crate) mod smart_lists_builder;
mod tag;
pub(crate) mod user;

use api_key::APIKeyQuery;
use book_club::BookClubQuery;
use book_club_book::BookClubBookQuery;
use book_club_discussion::BookClubDiscussionQuery;
use book_club_invitation::BookClubInvitationQuery;
use book_club_suggestion::BookClubSuggestionQuery;
use config::ConfigQuery;
use custom_emoji::CustomEmojiQuery;
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
use server_config::ServerConfigQuery;
use smart_list_view::SmartListViewQuery;
use smart_lists::SmartListsQuery;
use tag::TagQuery;
use user::UserQuery;

use crate::query::job::JobQuery;

// Note: I had to split the Query/Mutation root types into chunks to avoid a compiler
// overflow. It seems like a flat MergedObject creates a really large async block
// that is too deep for the compiler.

#[derive(async_graphql::MergedObject, Default)]
struct BookClubQueries(
	BookClubQuery,
	BookClubBookQuery,
	BookClubDiscussionQuery,
	BookClubInvitationQuery,
	BookClubSuggestionQuery,
);

#[derive(async_graphql::MergedObject, Default)]
struct ContentQueries(
	MediaQuery,
	LibraryQuery,
	SeriesQuery,
	EpubQuery,
	TagQuery,
	MediaMetadataOverviewQuery,
);

#[derive(async_graphql::MergedObject, Default)]
struct UserAndNotifsQueries(UserQuery, EmailerQuery, EmailDeviceQuery, NotifierQuery);

#[derive(async_graphql::MergedObject, Default)]
struct SystemQueries(
	APIKeyQuery,
	JobQuery,
	LogQuery,
	ConfigQuery,
	ServerConfigQuery,
	FilesystemQuery,
);

#[derive(async_graphql::MergedObject, Default)]
struct ListQueries(
	SmartListsQuery,
	SmartListViewQuery,
	ReadingListQuery,
	CustomEmojiQuery,
);

#[derive(async_graphql::MergedObject, Default)]
pub struct Query(
	BookClubQueries,
	ContentQueries,
	UserAndNotifsQueries,
	SystemQueries,
	ListQueries,
);
