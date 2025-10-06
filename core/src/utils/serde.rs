use regex::Regex;
use serde::{Deserialize, Deserializer};

pub fn string_list_deserializer<'de, D>(
	deserializer: D,
) -> Result<Option<Vec<String>>, D::Error>
where
	D: Deserializer<'de>,
{
	let str_sequence = String::deserialize(deserializer)?;
	Ok(Some(
		str_sequence
			.split(',')
			.map(|item| item.trim().to_owned())
			.collect(),
	))
}

// https://anansi-project.github.io/docs/comicinfo/schemas/v2.1
/// Deserializes a string into an age rating. This isn't the fanciest deserializer,
/// but it's fine.
pub fn age_rating_deserializer<'de, D>(deserializer: D) -> Result<Option<i32>, D::Error>
where
	D: Deserializer<'de>,
{
	// if exists and is empty, return None
	let str_sequence = Option::<String>::deserialize(deserializer)?
		.filter(|s| !s.is_empty())
		.map(|s| s.trim().to_owned());

	let Some(str_sequence) = str_sequence else {
		return Ok(None);
	};

	Ok(parse_age_restriction(&str_sequence))
}

pub fn parse_age_restriction(str_sequence: &str) -> Option<i32> {
	// check for the first case G/PG/PG-13/R
	let movie_rating = match str_sequence.to_lowercase().as_str() {
		"g" | "pg" => Some(0),
		"pg-13" => Some(13),
		"r" => Some(17),
		_ => None,
	};

	if movie_rating.is_some() {
		return movie_rating;
	}

	// check for the second case All Ages/Teen/Teen+/Mature
	let common_phrase = match str_sequence.to_lowercase().as_str() {
		"all ages" => Some(0),
		"everyone" => Some(0),
		"early childhood" => Some(8), // TODO: this is a guess
		"everyone 10+" => Some(10),
		"teen" => Some(13),
		"teen+" => Some(16),
		"ma15+" => Some(15),
		"mature 17+" => Some(17),
		"m" => Some(18),
		"mature" => Some(18),
		"adults only 18+" => Some(18),
		"r18+" => Some(18),
		"x18+" => Some(18),
		_ => None,
	};

	if common_phrase.is_some() {
		return common_phrase;
	}

	// check for the third case \d and up
	if let Ok(re) = Regex::new(r"(\d+) and up") {
		let age = re
			.captures(str_sequence)
			.and_then(|c| c.get(1))
			.and_then(|m| m.as_str().parse().ok());

		if age.is_some() {
			return age;
		}
	} else {
		tracing::error!("Failed to create regex for age rating parsing");
	}

	// check for the fourth case \d+
	if let Ok(re) = Regex::new(r"(\d+)") {
		let age = re
			.captures(str_sequence)
			.and_then(|c| c.get(1))
			.and_then(|m| m.as_str().parse().ok());

		if age.is_some() {
			return age;
		}
	} else {
		tracing::error!("Failed to create regex for age rating parsing");
	}

	// check for the fifth case \d-\d, only the first number is used
	if let Ok(re) = Regex::new(r"(\d+)-(\d+)") {
		let age = re
			.captures(str_sequence)
			.and_then(|c| c.get(1))
			.and_then(|m| m.as_str().parse().ok());

		if age.is_some() {
			return age;
		}
	} else {
		tracing::error!("Failed to create regex for age rating parsing");
	}

	// check final case of just a number
	str_sequence.parse().ok()
}

pub fn comma_separated_list_to_vec(vec: String) -> Vec<String> {
	vec.split(',').map(|v| v.trim().to_owned()).collect()
}
