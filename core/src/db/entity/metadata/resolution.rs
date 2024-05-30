use serde::{Deserialize, Deserializer, Serialize};

use std::str::FromStr;
use std::string::ToString;

use specta::Type;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ResolutionError {
	#[error("Error parsing {0}, expected value enclosed in ( and )")]
	InvalidParenthesis(String),
	#[error("Error parsing {0}, expected height and width")]
	ExpectedHeightWidth(String),
	#[error("Failed to parse number: {0}")]
	ErrorParsingInt(#[from] std::num::ParseIntError),
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

pub fn resolution_list_to_string(list: Vec<Resolution>) -> String {
	list.into_iter()
		.map(|res| res.to_string())
		.collect::<Vec<String>>()
		.join(";")
}

pub fn resolution_list_from_str(s: &str) -> Result<Vec<Resolution>, ResolutionError> {
	// Trim leading/trailing whitespace
	let s = s.trim();

	let each_res = s.split(";").collect::<Vec<_>>();
	let mut list = Vec::with_capacity(each_res.len());
	for res_str in each_res {
		list.push(Resolution::from_str(res_str)?);
	}

	Ok(list)
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
				height: 800,
				width: 600,
			},
		];

		let list_string = resolution_list_to_string(list);
		assert_eq!(list_string, "800,600;800,600;1920,1080;800,600");

		let list = vec![Resolution {
			height: 800,
			width: 600,
		}];
		let list_string = resolution_list_to_string(list);
		assert_eq!(list_string, "800,600");

		let list = vec![];
		let list_string = resolution_list_to_string(list);
		assert_eq!(list_string, "");
	}

	#[test]
	fn test_resolution_list_from_str() {
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

		let list = resolution_list_from_str("1920,1080;1920,1080;800,600;1920,1080");
		assert!(list.is_ok());
		assert_eq!(list.unwrap(), expected_list);
	}
}
