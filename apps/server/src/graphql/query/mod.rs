mod media;
mod user;

use media::MediaQuery;
use user::UserQuery;

#[derive(async_graphql::MergedObject, Default)]
pub struct Query(MediaQuery, UserQuery);
