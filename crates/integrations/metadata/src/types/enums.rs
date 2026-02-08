use serde::{Deserialize, Serialize};

/// Types of media that can be handled by metadata providers
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MediaType {
	Comic,
	Manga,
	Book,
	LightNovel,
	Manhwa,
	WebNovel,
	Webtoon,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum PublicationStatus {
	Ongoing,
	Completed,
	Hiatus,
	Cancelled,
	Upcoming,
}
