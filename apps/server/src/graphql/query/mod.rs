mod media;
mod reading_list;
mod user;

use media::MediaQuery;
use reading_list::ReadingListQuery;
use user::UserQuery;

#[derive(async_graphql::MergedObject, Default)]
pub struct Query(MediaQuery, UserQuery, ReadingListQuery);
