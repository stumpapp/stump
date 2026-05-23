mod api_key;
mod book_club;
mod book_club_book;
mod book_club_discussion;
mod book_club_invitation;
mod book_club_member;
mod book_club_suggestion;
mod custom_emoji;
mod email_device;
mod emailer;
mod epub;
mod job;
mod library;
mod log;
mod media;
mod media_metadata;
mod metadata_provider;
mod notifier;
mod reading_list;
pub mod reading_progress;
mod scheduled_job_config;
mod series;
mod series_metadata;
mod server_config;
mod smart_list_view;
mod smart_lists;
mod tag;
mod upload;
mod user;

use api_key::APIKeyMutation;
use book_club::BookClubMutation;
use book_club_book::BookClubBookMutation;
use book_club_discussion::BookClubDiscussionMutation;
use book_club_invitation::BookClubInvitationMutation;
use book_club_member::BookClubMemberMutation;
use book_club_suggestion::BookClubSuggestionMutation;
use custom_emoji::CustomEmojiMutation;
use email_device::EmailDeviceMutation;
use emailer::EmailerMutation;
use epub::EpubMutation;
use job::JobMutation;
use library::LibraryMutation;
use log::LogMutation;
use media::MediaMutation;
use media_metadata::MediaMetadataMutation;
use metadata_provider::MetadataProviderMutation;
use notifier::NotifierMutation;
use reading_list::ReadingListMutation;
use reading_progress::ReadProgressMutation;
use scheduled_job_config::ScheduledJobConfigMutation;
use series::SeriesMutation;
use series_metadata::SeriesMetadataMutation;
use server_config::ServerConfigMutation;
use smart_list_view::SmartListViewMutation;
use smart_lists::SmartListMutation;
use tag::TagMutation;
use upload::UploadMutation;
use user::UserMutation;

#[derive(async_graphql::MergedObject, Default)]
struct BookClubMutations(
	BookClubMutation,
	BookClubDiscussionMutation,
	BookClubInvitationMutation,
	BookClubMemberMutation,
	BookClubBookMutation,
	BookClubSuggestionMutation,
);

#[derive(async_graphql::MergedObject, Default)]
struct ContentMutations(
	MediaMutation,
	MediaMetadataMutation,
	SeriesMetadataMutation,
	LibraryMutation,
	SeriesMutation,
	EpubMutation,
	TagMutation,
	UploadMutation,
);

#[derive(async_graphql::MergedObject, Default)]
struct UserAndNotifsMutations(UserMutation, EmailerMutation, EmailDeviceMutation);

#[derive(async_graphql::MergedObject, Default)]
struct SystemMutations(
	APIKeyMutation,
	JobMutation,
	LogMutation,
	NotifierMutation,
	ServerConfigMutation,
	ScheduledJobConfigMutation,
	MetadataProviderMutation,
);

#[derive(async_graphql::MergedObject, Default)]
struct ListMutations(
	SmartListMutation,
	SmartListViewMutation,
	ReadingListMutation,
	CustomEmojiMutation,
);

#[derive(async_graphql::MergedObject, Default)]
pub struct Mutation(
	BookClubMutations,
	ContentMutations,
	UserAndNotifsMutations,
	SystemMutations,
	ListMutations,
	ReadProgressMutation,
);
