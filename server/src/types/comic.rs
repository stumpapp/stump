use rocket::serde::{Deserialize, Serialize};

// TODO: generalize to reuse this struct for epubs, pdfs, etc

// TODO: more fields
#[derive(Debug, Serialize, Deserialize, PartialEq)]
#[serde(crate = "rocket::serde")]
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
