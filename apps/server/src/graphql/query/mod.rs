use media::MediaQuery;

mod media;

#[derive(async_graphql::MergedObject, Default)]
pub struct Query(MediaQuery);
