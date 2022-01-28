use crate::database::entities::{media, series};
use sea_orm::FromQueryResult;

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

pub struct GetSeriesQuery {
    pub id: i32,
    pub path: String,
    pub title: String,
    pub book_count: i32,
    // pub thumbnail: String,
}

pub struct SeriesWithThumbnail {
    pub id: i32,
    pub path: String,
    pub title: String,
    pub book_count: i32,
    pub thumbnail: String,
}
