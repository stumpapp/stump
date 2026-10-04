use std::collections::HashSet;

use unicode_normalization::UnicodeNormalization;

pub fn normalize_author_name(name: &str) -> String {
	name.nfkd()
		.filter(|c| c.is_ascii()) // ascii only
		.collect::<String>()
		.to_lowercase()
		.split_whitespace()
		.collect::<Vec<_>>()
		.join(" ")
}

/// A best effort judgement on whether a name part looks like a bare surname
/// (the "Last" in "Last, First")
fn is_bare_surname(part: &str) -> bool {
	part.chars().next().is_some_and(|c| c.is_ascii_uppercase()) && !part.contains(' ')
}

/// Parses a single writers token (one piece between semicolons) into names. If the
/// original string had no semicolons, this is effectively splitting on commas with
/// a few workarounds to try to detect common formats, but it is frankly a bit of a
/// tough problem to handle
fn parse_token(token: &str) -> Vec<String> {
	let parts: Vec<&str> = token
		.split(',')
		.map(str::trim)
		.filter(|s| !s.is_empty())
		.collect();

	let mut names = Vec::new();
	let mut iter = parts.into_iter();
	while let Some(part) = iter.next() {
		if is_bare_surname(part) {
			if let Some(given) = iter.next() {
				names.push(format!("{given} {part}"));
				continue;
			}
		}
		names.push(part.to_string());
	}
	names
}

/// Parses a list of authors from a string, preferring semicolon-separated persons. Each
/// segment is then split per [parse_token]
pub fn parse_writers(raw: &str) -> Vec<String> {
	let mut names: Vec<String> = Vec::new();
	let mut seen: HashSet<String> = HashSet::new();
	// ^ not a single hashset to preserve order while deduping

	for token in raw.split(';') {
		let token = token.trim();
		if token.is_empty() {
			continue;
		}
		for name in parse_token(token) {
			if seen.insert(name.clone()) {
				names.push(name);
			}
		}
	}

	names
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_normalize_ascii_name_no_change() {
		assert_eq!(normalize_author_name("Becky Chambers"), "becky chambers");
	}

	#[test]
	fn test_normalize_special_characters_are_stripped() {
		// not actually spelling of her name ofc, just couldn't
		// think of anyone else offhand with a special char
		assert_eq!(normalize_author_name("Mártha Wells"), "martha wells");
	}

	#[test]
	fn test_normalize_leading_trailing_whitespace_trimmed() {
		assert_eq!(normalize_author_name("  Zaina Arafat  "), "zaina arafat");
	}

	#[test]
	fn test_normalize_internal_double_spaces_stripped_to_single() {
		assert_eq!(normalize_author_name("Becky  Chambers"), "becky chambers");
	}

	// sanity check
	#[test]
	fn test_normalize_empty_string() {
		assert_eq!(normalize_author_name(""), "");
	}

	// sanity check
	#[test]
	fn test_parse_writers_single_name() {
		assert_eq!(parse_writers("Martha Wells"), vec!["Martha Wells"]);
	}

	#[test]
	fn test_parse_writers_comma_separated_names() {
		assert_eq!(
			parse_writers("Becky Chambers, Zaina Arafat"),
			vec!["Becky Chambers", "Zaina Arafat"]
		);
	}

	#[test]
	fn test_parse_writers_last_first_reordered() {
		assert_eq!(
			parse_writers("Chambers, Becky; Arafat, Zaina"),
			vec!["Becky Chambers", "Zaina Arafat"]
		);
	}

	#[test]
	fn test_parse_writers_single_last_first() {
		assert_eq!(parse_writers("Wells, Martha"), vec!["Martha Wells"]);
	}

	#[test]
	fn test_parse_writers_last_first_then_plain_name() {
		assert_eq!(
			parse_writers("Chambers, Becky, Zaina Arafat"),
			vec!["Becky Chambers", "Zaina Arafat"]
		);
	}

	#[test]
	fn test_parse_writers_multiple_last_first_pairs() {
		assert_eq!(
			parse_writers("Chambers, Becky, Arafat, Zaina"),
			vec!["Becky Chambers", "Zaina Arafat"]
		);
	}

	#[test]
	fn test_parse_writers_plain_name_then_last_first() {
		assert_eq!(
			parse_writers("Martha Wells, Chambers, Becky"),
			vec!["Martha Wells", "Becky Chambers"]
		);
	}

	#[test]
	fn test_parse_writers_initials() {
		assert_eq!(
			parse_writers("Tolkien, J.R.R., Martha Wells"),
			vec!["J.R.R. Tolkien", "Martha Wells"]
		);
	}

	#[test]
	fn test_parse_writers_dedup_preserves_order() {
		assert_eq!(
			parse_writers("Becky Chambers, Zaina Arafat, Becky Chambers"),
			vec!["Becky Chambers", "Zaina Arafat"]
		);
	}
}
