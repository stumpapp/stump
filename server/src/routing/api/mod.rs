pub mod library_api;
pub mod media_api;

use sea_orm::{EntityTrait, JoinType, QuerySelect, RelationTrait};

use crate::{
    database::entities::{library, media, series},
    fs,
    types::dto::GetMediaQuery,
    State,
};

// BASE URL: /api

/// A handler for GET /api/scan. Scans the library for new media files and updates the database accordingly.
// TODO: make subscription that returns progress updates? https://rocket.rs/v0.5-rc/guide/responses/#async-streams
#[get("/scan")]
pub async fn scan(db: &State) -> Result<String, String> {
    let connection = db.get_connection();

    let libraries = library::Entity::find().all(connection).await.unwrap();

    let media = media::Entity::find()
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

    // fs::scan::scan(connection, libraries, media);
    let scanner = fs::scan::Scanner::new(connection, libraries, media);
    // scanner.scan().on_data(|_| {}) etc ????
    scanner.scan();

    Ok(format!("{:?}", connection))
}
