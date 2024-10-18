use order_by_gen::OrderByGen;
use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::db::query::IntoOrderBy;

#[derive(Default, Debug, Deserialize, Serialize, Type, ToSchema, OrderByGen)]
#[serde(rename_all = "snake_case")]
#[prisma(module = "media_metadata")]
pub enum MediaMetadataOrderBy {
	#[default]
	Title,
	Series,
	Number,
	Volume,
	Summary,
	Notes,
	AgeRating,
	Genre,
	Year,
	Month,
	Day,
	Writers,
	Pencillers,
	Inkers,
	Colorists,
	Letterers,
	CoverArtists,
	Editors,
	Publisher,
	Links,
	Characters,
	Teams,
	// Pages,
}

#[derive(Default, Debug, Deserialize, Serialize, Type, ToSchema, OrderByGen)]
#[serde(rename_all = "snake_case")]
#[prisma(module = "media")]
pub enum MediaOrderBy {
	#[default]
	Name,
	Size,
	Extension,
	CreatedAt,
	UpdatedAt,
	Status,
	Path,
	Pages,
	Metadata(Vec<MediaMetadataOrderBy>),
}
