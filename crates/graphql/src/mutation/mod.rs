mod api_key;
mod book_club;
mod book_club_invitation;
mod book_club_member;
mod book_club_schedule;
mod epub;
mod library;
mod log;
mod media;
mod notifier;
mod reading_list;
mod series;
mod tag;
mod upload;
mod user;

use api_key::APIKeyMutation;
use book_club::BookClubMutation;
use book_club_invitation::BookClubInvitationMutation;
use book_club_member::BookClubMemberMutation;
use book_club_schedule::BookClubScheduleMutation;
use epub::EpubMutation;
use library::LibraryMutation;
use log::LogMutation;
use media::MediaMutation;
use notifier::NotifierMutation;
use reading_list::ReadingListMutation;
use series::SeriesMutation;
use tag::TagMutation;
use upload::UploadMutation;
use user::UserMutation;

#[derive(async_graphql::MergedObject, Default)]
pub struct Mutation(
	APIKeyMutation,
	BookClubMutation,
	BookClubInvitationMutation,
	BookClubMemberMutation,
	BookClubScheduleMutation,
	NotifierMutation,
	EpubMutation,
	MediaMutation,
	LibraryMutation,
	LogMutation,
	ReadingListMutation,
	SeriesMutation,
	TagMutation,
	UploadMutation,
	UserMutation,
);
