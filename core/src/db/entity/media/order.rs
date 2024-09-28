use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{
	db::query::QueryOrder,
	prisma::{media, media_metadata},
	CoreError,
};

#[derive(Debug, Deserialize, Serialize, Type, ToSchema)]
#[serde(rename_all = "snake_case")]
enum MediaMetadataOrderBy {
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
	Pages,
}

impl TryInto<media_metadata::OrderByWithRelationParam>
	for QueryOrder<MediaMetadataOrderBy>
{
	type Error = CoreError;

	fn try_into(self) -> Result<media_metadata::OrderByWithRelationParam, Self::Error> {
		let direction = self.direction.into();
		Ok(match self.order_by {
			MediaMetadataOrderBy::Title => media_metadata::title::order(direction),
			MediaMetadataOrderBy::Series => media_metadata::series::order(direction),
			MediaMetadataOrderBy::Number => media_metadata::number::order(direction),
			MediaMetadataOrderBy::Volume => media_metadata::volume::order(direction),
			MediaMetadataOrderBy::Summary => media_metadata::summary::order(direction),
			MediaMetadataOrderBy::Notes => media_metadata::notes::order(direction),
			MediaMetadataOrderBy::AgeRating => {
				media_metadata::age_rating::order(direction)
			},
			MediaMetadataOrderBy::Genre => media_metadata::genre::order(direction),
			MediaMetadataOrderBy::Year => media_metadata::year::order(direction),
			MediaMetadataOrderBy::Month => media_metadata::month::order(direction),
			MediaMetadataOrderBy::Day => media_metadata::day::order(direction),
			MediaMetadataOrderBy::Writers => media_metadata::writers::order(direction),
			MediaMetadataOrderBy::Pencillers => {
				media_metadata::pencillers::order(direction)
			},
			MediaMetadataOrderBy::Inkers => media_metadata::inkers::order(direction),
			MediaMetadataOrderBy::Colorists => {
				media_metadata::colorists::order(direction)
			},
			MediaMetadataOrderBy::Letterers => {
				media_metadata::letterers::order(direction)
			},
			MediaMetadataOrderBy::CoverArtists => {
				media_metadata::cover_artists::order(direction)
			},
			MediaMetadataOrderBy::Editors => media_metadata::editors::order(direction),
			MediaMetadataOrderBy::Publisher => {
				media_metadata::publisher::order(direction)
			},
			MediaMetadataOrderBy::Links => media_metadata::links::order(direction),
			MediaMetadataOrderBy::Characters => {
				media_metadata::characters::order(direction)
			},
			MediaMetadataOrderBy::Teams => media_metadata::teams::order(direction),
			MediaMetadataOrderBy::Pages => media_metadata::page_count::order(direction),
		})
	}
}

#[derive(Debug, Deserialize, Serialize, Type, ToSchema)]
#[serde(rename_all = "snake_case")]
enum MediaOrderBy {
	Name,
	Size,
	Extension,
	CreatedAt,
	UpdatedAt,
	Status,
	Path,
	Pages,
	Metadata(MediaMetadataOrderBy),
}

impl TryInto<media::OrderByWithRelationParam> for QueryOrder<MediaOrderBy> {
	type Error = CoreError;

	fn try_into(self) -> Result<media::OrderByWithRelationParam, Self::Error> {
		let direction = self.direction.into();

		Ok(match self.order_by {
			MediaOrderBy::Name => media::name::order(direction),
			MediaOrderBy::Size => media::size::order(direction),
			MediaOrderBy::Extension => media::extension::order(direction),
			MediaOrderBy::CreatedAt => media::created_at::order(direction),
			MediaOrderBy::UpdatedAt => media::updated_at::order(direction),
			MediaOrderBy::Status => media::status::order(direction),
			MediaOrderBy::Path => media::path::order(direction),
			MediaOrderBy::Pages => media::pages::order(direction),
			MediaOrderBy::Metadata(metadata) => {
				media::metadata::order(vec![QueryOrder {
					order_by: metadata,
					direction: self.direction,
				}
				.try_into()?])
			},
		})
	}
}
