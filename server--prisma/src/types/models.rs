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
    pub progress: i32,
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
            progress: rp.page,
        }
    }
}
