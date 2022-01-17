pub mod library_api;
pub mod media_api;

use sea_orm::EntityTrait;

use crate::{
    database::entities::{library, media, series},
    fs, State,
};

// BASE URL: /api

/// A handler for GET /api/scan. Scans the library for new media files and updates the database accordingly.
#[get("/scan")]
pub async fn scan(db: &State) -> Result<String, String> {
    let connection = db.get_connection();

    let media_folders = library::Entity::find()
        // .find_with_related(media::Entity)
        .all(connection)
        .await
        .expect("Could not find media folders");

    // TODO: use hashmap?
    let series_media = series::Entity::find()
        .find_with_related(media::Entity)
        .all(connection)
        .await
        .expect("Could not find media");

    let new_media_count = fs::scan(connection, media_folders);

    Ok(format!("{:?}", connection))
}
