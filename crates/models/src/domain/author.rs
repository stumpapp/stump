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

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_ascii_name_no_change() {
		assert_eq!(normalize_author_name("Becky Chambers"), "becky chambers");
	}

	// TODO: idk more tests, maybe an umlaut and shit and assert it goes away
	// at the same time tho that is largely assumed functional via the library so
}
