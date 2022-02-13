use chrono::NaiveDateTime;
use serde::Serialize;

use crate::types::alias::{MediaWithMaybeProgress, SeriesModel};

#[derive(Serialize, Debug)]
pub struct GetMediaByIdWithProgress {
    pub id: i32,
    pub series_id: i32,
    pub name: String,
    pub description: Option<String>,
    pub size: i64,
    pub extension: String,
    pub pages: i32,
    pub current_page: Option<i32>,
    pub updated_at: std::option::Option<NaiveDateTime>,
    pub downloaded: bool,
    pub checksum: String,
    pub path: String,
}

impl Into<GetMediaByIdWithProgress> for MediaWithMaybeProgress {
    fn into(self) -> GetMediaByIdWithProgress {
        let (media, progress) = self;

        GetMediaByIdWithProgress {
            id: media.id,
            series_id: media.series_id,
            name: media.name,
            description: media.description,
            size: media.size,
            extension: media.extension,
            pages: media.pages,
            current_page: match progress {
                Some(progress) => Some(progress.page),
                None => None,
            },
            updated_at: media.updated_at,
            downloaded: media.downloaded,
            checksum: media.checksum,
            path: media.path,
        }
    }
}
