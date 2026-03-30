use async_graphql::SimpleObject;
use sea_orm::{prelude::Decimal, FromJsonQueryResult};
use serde::{Deserialize, Serialize};

#[derive(Default, Debug, Clone, SimpleObject)]
pub struct ImageRef {
	pub url: String,
	pub height: Option<u32>,
	pub width: Option<u32>,
	pub metadata: Option<ImageMetadata>,
}

#[derive(
	Debug, Clone, SimpleObject, Deserialize, Serialize, PartialEq, Eq, FromJsonQueryResult,
)]
pub struct ImageDimensions {
	pub width: u32,
	pub height: u32,
}

#[derive(
	Debug, Clone, SimpleObject, Deserialize, Serialize, PartialEq, Eq, FromJsonQueryResult,
)]
pub struct ImageColor {
	pub color: String,
	pub percentage: Decimal,
}

#[derive(
	Default,
	Debug,
	Clone,
	SimpleObject,
	Deserialize,
	Serialize,
	PartialEq,
	Eq,
	FromJsonQueryResult,
)]
pub struct ImageMetadata {
	pub average_color: Option<String>,
	pub colors: Vec<ImageColor>,
	pub thumbhash: Option<String>,
	pub dimensions: Option<ImageDimensions>,
}

#[cfg(test)]
mod tests {
	use crate::shared::image::{ImageDimensions, ImageMetadata};

	// Note: The context here is that I added the `dimensions` field to `ImageMetadata` and want to verify that
	// existing JSON values in the db won't break deserialization
	#[test]
	fn test_parse_without_dimensions() {
		let legacy = r##"{"average_color":"#e3e8ed","colors":[{"color":"#293744","percentage":"0.014"},{"color":"#577591","percentage":"0.019"},{"color":"#6b8eac","percentage":"0.065"},{"color":"#6cdee3","percentage":"0.021"},{"color":"#d1dae8","percentage":"0.173"},{"color":"#f7ecec","percentage":"0.095"},{"color":"#fefefe","percentage":"0.613"}],"thumbhash":"ufcFDQL4dGeFylaKmYa5l/l3iy/G"}"##;
		let metadata: ImageMetadata = serde_json::from_str(legacy).unwrap();
		assert_eq!(metadata.dimensions, None);
	}

	#[test]
	fn test_parse_with_dimensions() {
		let json = r##"{"average_color":"#e3e8ed","colors":[{"color":"#293744","percentage":"0.014"},{"color":"#577591","percentage":"0.019"},{"color":"#6b8eac","percentage":"0.065"},{"color":"#6cdee3","percentage":"0.021"},{"color":"#d1dae8","percentage":"0.173"},{"color":"#f7ecec","percentage":"0.095"},{"color":"#fefefe","percentage":"0.613"}],"thumbhash":"ufcFDQL4dGeFylaKmYa5l/l3iy/G","dimensions":{"width":100,"height":200}}"##;
		let metadata: ImageMetadata = serde_json::from_str(json).unwrap();
		assert_eq!(
			metadata.dimensions,
			Some(ImageDimensions {
				width: 100,
				height: 200
			})
		);
	}
}
