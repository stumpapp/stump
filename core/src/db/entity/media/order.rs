use order_by_gen::OrderByGen;
use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::db::query::{Direction, IntoOrderBy, QueryOrder};

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

impl MediaOrderBy {
	pub fn ensure_default(
		v: Vec<QueryOrder<MediaOrderBy>>,
	) -> Vec<QueryOrder<MediaOrderBy>> {
		if v.is_empty() {
			vec![QueryOrder {
				order_by: MediaOrderBy::Name,
				direction: Direction::Asc,
			}]
		} else {
			v
		}
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_serialize_media_relation_order_by() {
		let order = MediaOrderBy::Metadata(vec![MediaMetadataOrderBy::Title]);
		let serialized = serde_json::to_string(&order).unwrap();
		assert_eq!(serialized, r#"{"metadata":["title"]}"#);
	}
}
