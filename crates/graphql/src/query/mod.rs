mod book_club;
pub(crate) mod media;
pub(crate) mod reading_list;
pub(crate) mod user;

use media::MediaQuery;
use reading_list::ReadingListQuery;
use user::UserQuery;

#[derive(async_graphql::MergedObject, Default)]
pub struct Query(MediaQuery, UserQuery, ReadingListQuery);
