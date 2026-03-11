use async_graphql::Enum;
use serde::{Deserialize, Serialize};

/// Represents a specific metadata field that can be locked or configured
/// for per-field merge strategies
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Enum)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MetadataField {
	Title,
	Summary,
	Genres,
	Tags,
	Artists,
	Publisher,
	Year,
	AgeRating,
	Cover,
	Status,
	VolumeCount,
	PageCount,
	Isbn,
	ReleaseDate,
	Colorists,
	Letterers,
	CoverArtists,
	Writers,
	Format,
	TitleSort,
	Number,
	Series,
	SeriesGroup,
	Notes,
	Language,
	Editors,
	Inkers,
	Teams,
	Links,
	Characters,
	StoryArc,
	StoryArcNumber,
	BookType,
	Imprint,
	PublicationRun,
	Pencillers,
	IdentifierAmazon,
	IdentifierCalibre,
	IdentifierGoogle,
	IdentifierMobiAsin,
	IdentifierUuid,
	ComicId,
	MetaType,
	ComicImage,
	DescriptionFormatted,
}

/// Types of media that can be handled by metadata providers
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
pub enum MediaType {
	Comic,
	Manga,
	Book,
	LightNovel,
	Manhwa,
	WebNovel,
	Webtoon,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
pub enum PublicationStatus {
	Ongoing,
	Completed,
	Hiatus,
	Cancelled,
	Upcoming,
}
