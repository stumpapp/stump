pub mod media;
pub mod series;
pub mod user;

use entity::sea_orm;
use entity::{library, util::FileStatus};
use rocket::serde::Serialize;
use sea_orm::FromQueryResult;

use super::alias::SeriesModel;

// I wanted to flatten this query into one struct to simplify some of the fs indexing logic
// I need to write.
#[derive(FromQueryResult, Debug)]
pub struct GetMediaQuery {
    pub id: i32,
    pub library_id: i32,
    pub library_path: String,
    pub series_id: i32,
    pub series_path: String,
    pub name: String,
    pub description: Option<String>,
    pub size: i64,
    pub extension: String,
    pub pages: i64,
    pub updated_at: String,
    pub downloaded: bool,
    pub checksum: String,
    pub path: String,
    pub status: FileStatus,
}

pub type GetMediaQueryResult = Vec<GetMediaQuery>;

#[derive(Serialize, Debug)]
#[serde(crate = "rocket::serde")]
pub struct GetLibraryWithSeriesQuery {
    // pub library: library::Model,
    pub id: i32,
    pub name: String,
    pub path: String,
    pub status: FileStatus,
    pub series: Vec<SeriesModel>,
}

impl Into<GetLibraryWithSeriesQuery> for (library::Model, Vec<SeriesModel>) {
    fn into(self) -> GetLibraryWithSeriesQuery {
        GetLibraryWithSeriesQuery {
            // library: self.0,
            id: self.0.id,
            name: self.0.name,
            path: self.0.path,
            status: self.0.status,
            series: self.1,
        }
    }
}
