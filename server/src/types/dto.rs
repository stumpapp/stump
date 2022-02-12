use crate::database::entities::{library, media, read_progress, series};
use sea_orm::FromQueryResult;
use serde::Serialize;

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
}

pub type GetMediaQueryResult = Vec<GetMediaQuery>;

#[derive(Serialize, Debug)]
pub struct GetLibraryWithSeriesQuery {
    pub library: library::Model,
    pub series: Vec<series::Model>,
}

impl Into<GetLibraryWithSeriesQuery> for (library::Model, Vec<series::Model>) {
    fn into(self) -> GetLibraryWithSeriesQuery {
        GetLibraryWithSeriesQuery {
            library: self.0,
            series: self.1,
        }
    }
}
