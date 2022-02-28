use entity::util::FileStatus;
use rocket::serde::Serialize;

use crate::types::alias::{MediaModel, SeriesModel};

#[derive(Serialize, Debug)]
#[serde(crate = "rocket::serde")]
pub struct GetSeriesById {
    // pub series: SeriesModel,
    pub id: i32,
    pub library_id: i32,
    pub title: String,
    pub book_count: i32,
    pub updated_at: Option<chrono::NaiveDateTime>,
    pub path: String,
    pub status: FileStatus,
    pub media: Vec<MediaModel>,
}

impl Into<GetSeriesById> for (SeriesModel, Vec<MediaModel>) {
    fn into(self) -> GetSeriesById {
        GetSeriesById {
            id: self.0.id,
            library_id: self.0.library_id,
            title: self.0.title,
            book_count: self.0.book_count,
            updated_at: self.0.updated_at,
            path: self.0.path,
            status: self.0.status,
            media: self.1,
        }
    }
}
