pub mod library_api;
pub mod media_api;

use rocket::response::stream::{Event, EventStream};
use rocket::tokio::{
    select,
    time::{self, Duration},
};
use rocket::Shutdown;
use sea_orm::{EntityTrait, JoinType, QueryFilter, QueryOrder, QuerySelect, RelationTrait};

use crate::{
    database::entities::{library, media, series},
    fs,
    types::dto::{GetMediaQuery, GetMediaQueryResult},
    State,
};

// BASE URL: /api

/// A handler for GET /api/scan. Scans the library for new media files and updates the database accordingly.
#[get("/scan")]
pub async fn scan(db: &State) -> Result<(), String> {
    let connection = db.get_connection();

    // let series_and_libraries = series::Entity::find()
    //     .find_with_related(library::Entity)
    //     .all(connection)
    //     .await
    //     .map_err(|e| e.to_string())?;

    // TODO: optimize these queries to one if possible. Above won't work if there are no series.

    let series = series::Entity::find()
        .all(connection)
        .await
        .map_err(|e| e.to_string())?;

    let libraries = library::Entity::find()
        .all(connection)
        .await
        .map_err(|e| e.to_string())?;

    if libraries.is_empty() {
        return Err("No libraries configured".to_string());
    }

    let media: GetMediaQueryResult = media::Entity::find()
        .column_as(library::Column::Id, "library_id")
        .column_as(library::Column::Path, "library_path")
        .column_as(series::Column::Path, "series_path")
        .join(JoinType::InnerJoin, media::Relation::Series.def())
        .group_by(series::Column::Id)
        .join(JoinType::InnerJoin, series::Relation::Library.def())
        .group_by(library::Column::Id)
        .into_model::<GetMediaQuery>()
        .all(db.get_connection())
        .await
        .map_err(|e| e.to_string())?;

    let mut scanner = fs::scan::Scanner::new(connection, libraries, series, media);
    // Should I await this? Or should I just let it run maybe in a new thread and then
    // return? I can maybe stream the progress updates to the client or something?. TODO:
    // scanner.scan().on_data(|_| {}) etc ????
    // https://api.rocket.rs/master/rocket/response/stream/struct.EventStream.html maybe?
    scanner.scan().await;

    Ok(())
}

// https://github.com/SergioBenitez/Rocket/blob/v0.5-rc/examples/chat/src/main.rs
// #[get("/events")]
// pub async fn log_listener(db: &State, mut end: Shutdown) -> EventStream![] {
//     EventStream! {
//         let mut interval = time::interval(Duration::from_secs(1));
//         loop {
//             select! {
//                 _ = &mut end => break,
//                 _ => {
//                     yield Event::data("log: test");
//                     interval.tick().await;
//                 }
//             }
//
//         }
//     }
// }
