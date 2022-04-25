use serde::{Deserialize, Serialize};

use crate::prisma;

#[derive(Default, Clone, Debug, Serialize, Deserialize)]
pub struct AuthenticatedUser {
    pub id: String,
    pub username: String,
    pub role: String,
}

impl Into<AuthenticatedUser> for prisma::user::Data {
    fn into(self) -> AuthenticatedUser {
        AuthenticatedUser {
            id: self.id,
            username: self.username,
            role: self.role,
        }
    }
}

#[derive(Debug)]
pub struct DecodedCredentials {
    pub username: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaWithProgress {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub size: i32,
    pub extension: String,
    pub pages: i32,
    // pub updated_at
    // pub checksum: String
    pub path: String,
    pub series_id: String,
    pub progress: Option<i32>,
}

// TODO: this disgusting thing can be removed once https://github.com/Brendonovich/prisma-client-rust/issues/12
// gets implemented
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SeriesWithMedia {
    pub id: String,
    pub name: String,
    pub path: String,
    pub media: Vec<MediaWithProgress>,
}

impl Into<SeriesWithMedia>
    for (
        prisma::series::Data,
        Vec<prisma::media::Data>,
        &Vec<prisma::read_progress::Data>,
    )
{
    fn into(self) -> SeriesWithMedia {
        let (series, media, progress) = self;

        let mut media_with_progress: Vec<MediaWithProgress> = vec![];

        for m in media.iter() {
            let mut current_page = None;

            for p in progress.iter() {
                if p.media_id == m.id {
                    current_page = Some(p.page);
                }
            }

            media_with_progress.push(MediaWithProgress {
                id: m.id.clone(),
                name: m.name.clone(),
                description: m.description.clone(),
                size: m.size,
                extension: m.extension.clone(),
                pages: m.pages,
                path: m.path.clone(),
                series_id: series.id.clone(),
                progress: current_page,
            });
        }

        SeriesWithMedia {
            id: series.id,
            name: series.name,
            path: series.path,
            media: media_with_progress,
        }
    }
}

impl Into<MediaWithProgress> for (prisma::media::Data, prisma::read_progress::Data) {
    fn into(self) -> MediaWithProgress {
        let (m, rp) = self;

        MediaWithProgress {
            id: m.id,
            name: m.name,
            description: m.description,
            size: m.size,
            extension: m.extension,
            pages: m.pages,
            path: m.path,
            series_id: m.series_id.unwrap(),
            progress: Some(rp.page),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ComicInfo {
    #[serde(rename = "Series")]
    pub series: Option<String>,
    #[serde(rename = "Number")]
    pub number: Option<usize>,
    #[serde(rename = "Web")]
    pub web: Option<String>,
    #[serde(rename = "Summary")]
    pub summary: Option<String>,
    #[serde(rename = "Publisher")]
    pub publisher: Option<String>,
    #[serde(rename = "Genre")]
    pub genre: Option<String>,
    #[serde(rename = "PageCount")]
    pub page_count: Option<usize>,
}

impl ComicInfo {
    pub fn default() -> Self {
        Self {
            series: None,
            number: None,
            web: None,
            summary: None,
            publisher: None,
            genre: None,
            page_count: None,
        }
    }
}
