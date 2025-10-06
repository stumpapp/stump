//! This module defines structures for storing and retrieving page dimensions data. The
//! two primary structures defined here are [`PageDimension`], which represents a pair of
//! page dimensions (height, width), and [`PageDimensionsEntity`], which is the rust
//! representation of a database row in the `page_dimensions` table.
//!
//! In addition to defining data structures, this module includes a simple compression
//! algorithm for storing and retrieving [Vec]<[`PageDimension`]s. The [`dimension_vec_to_string`]
//! and [`dimension_vec_from_str`] methods can be used for serializing and deserializing this
//! structure

use async_graphql::SimpleObject;
use sea_orm::FromJsonQueryResult;
use serde::{Deserialize, Serialize};

use std::fmt;
use std::str::FromStr;
use std::string::ToString;

#[derive(thiserror::Error, Debug)]
pub enum PageDimensionParserError {
	#[error("Error parsing {0}, expected height and width")]
	ExpectedHeightWidth(String),
	#[error("Error parsing {0}, malformed run syntax")]
	MalformedRunSyntax(String),
	#[error("Failed to parse number: {0}")]
	ErrorParsingInt(#[from] std::num::ParseIntError),
}

/// A struct containing the various analyses of a book in Stump, e.g., page dimensions.
#[derive(
	Serialize, Deserialize, Debug, Clone, PartialEq, Eq, FromJsonQueryResult, SimpleObject,
)]

pub struct PageAnalysis {
	pub dimensions: Vec<PageDimension>,
	// pub content_types: Vec<ContentType>, // or Vec<String>?
}

/// Represents a page dimension for a page of a Stump media item. It consists of a
/// height and a width.
#[derive(
	Serialize, Deserialize, Debug, Clone, PartialEq, Eq, FromJsonQueryResult, SimpleObject,
)]
pub struct PageDimension {
	pub height: u32,
	pub width: u32,
}

impl PageDimension {
	pub fn new(height: u32, width: u32) -> Self {
		Self { height, width }
	}
}

impl fmt::Display for PageDimension {
	fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
		write!(f, "{},{}", self.height, self.width)
	}
}

impl FromStr for PageDimension {
	type Err = PageDimensionParserError;

	fn from_str(s: &str) -> Result<Self, Self::Err> {
		// Trim leading/trailing whitespace
		let s = s.trim();

		// Check for correct layout
		let dims = s.split(',').collect::<Vec<_>>();
		if dims.len() != 2 {
			return Err(PageDimensionParserError::ExpectedHeightWidth(s.to_string()));
		}

		// Parse values
		let height = dims[0].trim().parse::<u32>()?;
		let width = dims[1].trim().parse::<u32>()?;

		Ok(PageDimension { height, width })
	}
}

/// Serializes a [Vec]<[`PageDimension`]> as a [String].
///
/// The serialization uses comma-separation for height and width in [`PageDimension`], and semicolon-separation
/// for each [`PageDimension`] object. Additionally, it uses a form of deduplication that encodes a run of n > 1
/// [`PageDimension`]s as `"n>height,width"`. An empty vector serializes to `""`.
pub fn dimension_vec_to_string(list: Vec<PageDimension>) -> String {
	let mut encoded_strings = Vec::new();
	let mut run_count = 0;
	let mut run_dimension: Option<PageDimension> = None;

	// Loop over each of the items in the list to be encoded
	for next_dim in list {
		match run_dimension {
			// If there's already a run going and it matches the next, increment the counter
			Some(ref run_dim) if *run_dim == next_dim => run_count += 1,
			// If there's either a run going and it doesn't match, or no run...
			_ => {
				// This branch handles write-out if a run is going and it didn't match
				if let Some(run_dim) = run_dimension {
					if run_count > 1 {
						encoded_strings.push(format!("{run_count}>{run_dim}"));
					} else {
						encoded_strings.push(run_dim.to_string());
					}
				}

				// In either case, we need to set the run and reset the count
				run_dimension = Some(next_dim);
				run_count = 1;
			},
		}
	}

	// This handles write-out for the final item
	if let Some(run_dim) = run_dimension {
		if run_count > 1 {
			encoded_strings.push(format!("{run_count}>{run_dim}"));
		} else {
			encoded_strings.push(run_dim.to_string());
		}
	}

	encoded_strings.join(";")
}

/// Deserializes a [Vec]<[`PageDimension`]> from a [String] containing its serialized form.
///
/// The serialization uses comma-separation for height and width in [`PageDimension`], and semicolon-separation
/// for each [`PageDimension`] object. Additionally, it uses a form of deduplication that encodes a run of n > 1
/// [`PageDimension`]s as `"n>height,width"`. An empty vector serializes to `""`.
pub fn dimension_vec_from_str(
	s: &str,
) -> Result<Vec<PageDimension>, PageDimensionParserError> {
	// Early return for an empty string
	if s.is_empty() {
		return Ok(Vec::new());
	}

	// Trim leading/trailing whitespace
	let s = s.trim();

	let chunks = s.split(';').collect::<Vec<_>>();
	// This will be under-capacity unless every dimension pair differs, but that's fine
	let mut out_list = Vec::with_capacity(chunks.len());

	// Loop over each encoded chunk
	for encoded_str in chunks {
		match encoded_str.find('>') {
			// Handle case where there's multiple of something
			Some(_) => {
				// Split out the number and the encoded item
				let items = encoded_str.split('>').collect::<Vec<_>>();

				// Sanity check
				if items.len() != 2 {
					return Err(PageDimensionParserError::MalformedRunSyntax(
						encoded_str.to_string(),
					));
				}

				// Parse number
				let num_repeated: usize = items.first().unwrap().parse()?;
				// Parse dimension
				let dimension = PageDimension::from_str(items.get(1).unwrap())?;
				// Push as many as we need
				out_list.extend(vec![dimension; num_repeated]);
			},
			None => out_list.push(PageDimension::from_str(encoded_str)?),
		}
	}

	Ok(out_list)
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_dimension_to_string() {
		let serialized_dimension = PageDimension::new(800, 600).to_string();
		assert_eq!("800,600", serialized_dimension);
	}

	#[test]
	fn test_dimension_from_str() {
		let deserialized_dimension = PageDimension::from_str("1920,1080").unwrap();
		assert_eq!(deserialized_dimension, PageDimension::new(1920, 1080));
	}

	#[test]
	fn test_dimension_vec_to_string() {
		// Comma and semicolon-separated serialization of height/width pairs.
		let list = vec![
			PageDimension::new(800, 600),
			PageDimension::new(1920, 1080),
			PageDimension::new(800, 600),
		];
		let serialized_list = dimension_vec_to_string(list);
		assert_eq!(serialized_list, "800,600;1920,1080;800,600");

		// Repeated values are compressed with shorthand.
		let list = vec![
			PageDimension::new(800, 600),
			PageDimension::new(800, 600),
			PageDimension::new(800, 600),
		];
		let serialized_list = dimension_vec_to_string(list);
		assert_eq!(serialized_list, "3>800,600");

		// Empty vectors are serialized to an empty String.
		let list = vec![];
		let serialized_list = dimension_vec_to_string(list);
		assert_eq!(serialized_list, "");
	}

	#[test]
	fn test_dimension_vec_from_str() {
		// Deserializing an alternating string.
		let deserialized_dimensions =
			dimension_vec_from_str("1920,1080;800,600;1920,1080").unwrap();
		assert_eq!(
			deserialized_dimensions,
			vec![
				PageDimension::new(1920, 1080),
				PageDimension::new(800, 600),
				PageDimension::new(1920, 1080)
			]
		);

		// Deserializing a string with repeated-dimension shorthand.
		let deserialized_dimensions = dimension_vec_from_str("3>1920,1080").unwrap();
		assert_eq!(
			deserialized_dimensions,
			vec![
				PageDimension::new(1920, 1080),
				PageDimension::new(1920, 1080),
				PageDimension::new(1920, 1080)
			]
		);

		// Deserializing an empty string.
		let deserialized_dimensions = dimension_vec_from_str("").unwrap();
		assert_eq!(deserialized_dimensions, vec![]);
	}
}
