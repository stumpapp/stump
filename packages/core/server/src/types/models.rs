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
