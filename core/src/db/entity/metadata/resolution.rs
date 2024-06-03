use serde::{Deserialize, Serialize};

use std::str::FromStr;
use std::string::ToString;

use specta::Type;
use thiserror::Error;

use crate::prisma::page_resolutions;

#[derive(Error, Debug)]
pub enum ResolutionError {
	#[error("Error parsing {0}, expected height and width")]
	ExpectedHeightWidth(String),
	#[error("Error parsing {0}, malformed run syntax")]
	MalformedRunSyntax(String),
	#[error("Failed to parse number: {0}")]
	ErrorParsingInt(#[from] std::num::ParseIntError),
}

#[derive(Serialize, Deserialize, Debug, Clone, Type)]
pub struct PageResolutions {
	pub id: String,
	pub resolutions: Vec<Resolution>,
	pub metadata_id: String,
}

impl From<page_resolutions::Data> for PageResolutions {
	fn from(value: page_resolutions::Data) -> Self {
		let resolutions = match resolution_vec_from_str(&value.resolutions) {
			Ok(res) => res,
			Err(e) => {
				tracing::error!("Failed to deserialize page resolution: {}", e);
				vec![]
			},
		};

		Self {
			id: value.id,
			resolutions,
			metadata_id: value.metadata_id,
		}
	}
}

#[derive(Serialize, Deserialize, Debug, Clone, Type, PartialEq)]
pub struct Resolution {
	pub height: u32,
	pub width: u32,
}

impl ToString for Resolution {
	fn to_string(&self) -> String {
		format!("{},{}", self.height, self.width)
	}
}

impl FromStr for Resolution {
	type Err = ResolutionError;

	fn from_str(s: &str) -> Result<Self, Self::Err> {
		// Trim leading/trailing whitespace
		let s = s.trim();

		// Check for correct layout
		let dims = s.split(",").collect::<Vec<_>>();
		if dims.len() != 2 {
			return Err(ResolutionError::ExpectedHeightWidth(s.to_string()));
		}

		// Parse values
		let height = dims[0]
			.trim()
			.parse::<u32>()
			.map_err(ResolutionError::ErrorParsingInt)?;
		let width = dims[1]
			.trim()
			.parse::<u32>()
			.map_err(ResolutionError::ErrorParsingInt)?;

		Ok(Resolution { height, width })
	}
}

pub fn resolution_vec_to_string(list: Vec<Resolution>) -> String {
	let mut encoded_strings = Vec::new();
	let mut run_count = 0;
	let mut run_resolution: Option<Resolution> = None;

	// Loop over each of the items in the list to be encoded
	for next_res in list.into_iter() {
		match run_resolution {
			// If there's already a run going and it matches the next, increment the counter
			Some(ref run_res) if *run_res == next_res => run_count += 1,
			// If there's either a run going and it doesn't match, or no run...
			_ => {
				// This branch handles writeout if a run is going and it didn't match
				if let Some(run_res) = run_resolution {
					if run_count > 1 {
						encoded_strings.push(format!(
							"{}>{}",
							run_count,
							run_res.to_string()
						));
					} else {
						encoded_strings.push(run_res.to_string());
					}
				}

				// In either case, we need to set the run and reset the count
				run_resolution = Some(next_res);
				run_count = 1;
			},
		}
	}

	// This handles writeout for the final item
	if let Some(run_res) = run_resolution {
		if run_count > 1 {
			encoded_strings.push(format!("{}>{}", run_count, run_res.to_string()));
		} else {
			encoded_strings.push(run_res.to_string());
		}
	}

	encoded_strings.join(";")
}

pub fn resolution_vec_from_str(s: &str) -> Result<Vec<Resolution>, ResolutionError> {
	// Trim leading/trailing whitespace
	let s = s.trim();

	let chunks = s.split(";").collect::<Vec<_>>();
	// This will be under-capacity unless every resolution differs, but that's fine
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
					return Err(ResolutionError::MalformedRunSyntax(
						encoded_str.to_string(),
					));
				}

				// Parse number
				let num_repeated: usize = items.get(0).unwrap().parse()?;
				// Parse resolution
				let resolution = Resolution::from_str(items.get(1).unwrap())?;
				// Push as many as we need
				out_list.extend(vec![resolution; num_repeated]);
			},
			None => out_list.push(Resolution::from_str(encoded_str)?),
		}
	}

	Ok(out_list)
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_resolution_to_string() {
		let res = Resolution {
			height: 800,
			width: 600,
		};

		let res_string = res.to_string();
		assert_eq!("800,600", res_string);
	}

	#[test]
	fn test_resolution_from_str() {
		let expected_res = Resolution {
			height: 1920,
			width: 1080,
		};

		let res = Resolution::from_str("1920,1080");
		assert!(res.is_ok());
		assert_eq!(res.unwrap(), expected_res);
	}

	#[test]
	fn test_resolution_list_to_string() {
		let list = vec![
			Resolution {
				height: 800,
				width: 600,
			},
			Resolution {
				height: 800,
				width: 600,
			},
			Resolution {
				height: 1920,
				width: 1080,
			},
			Resolution {
				height: 1920,
				width: 1080,
			},
			Resolution {
				height: 800,
				width: 600,
			},
		];

		let list_string = resolution_vec_to_string(list);
		assert_eq!(list_string, "2>800,600;2>1920,1080;800,600");

		let list = vec![Resolution {
			height: 800,
			width: 600,
		}];
		let list_string = resolution_vec_to_string(list);
		assert_eq!(list_string, "800,600");

		let list = vec![];
		let list_string = resolution_vec_to_string(list);
		assert_eq!(list_string, "");
	}

	#[test]
	fn test_resolution_list_from_str() {
		let list = resolution_vec_from_str("2>1920,1080;800,600;1920,1080");
		let expected_list = vec![
			Resolution {
				height: 1920,
				width: 1080,
			},
			Resolution {
				height: 1920,
				width: 1080,
			},
			Resolution {
				height: 800,
				width: 600,
			},
			Resolution {
				height: 1920,
				width: 1080,
			},
		];

		assert!(list.is_ok());
		assert_eq!(list.unwrap(), expected_list);
	}
}
