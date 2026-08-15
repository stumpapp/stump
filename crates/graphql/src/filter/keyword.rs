//! LIKE-pattern escaping helpers for string filters

use sea_orm::sea_query::LikeExpr;

/// The escape character paired with every generated `LIKE` pattern
const LIKE_ESCAPE_CHAR: char = '\\';

/// Escapes the LIKE metacharacters `%` and `_`, plus the escape character
/// itself, so e.g., a search for `50%` is correctly understood to be literal
/// and not a pattern
pub fn escape_like_fragment(input: &str) -> String {
	let mut escaped = String::with_capacity(input.len());
	for ch in input.chars() {
		if ch == LIKE_ESCAPE_CHAR || ch == '%' || ch == '_' {
			escaped.push(LIKE_ESCAPE_CHAR);
		}
		escaped.push(ch);
	}
	escaped
}

/// `%value%`, with `value` lowercased and escaped
pub(crate) fn like_contains(value: &str) -> LikeExpr {
	LikeExpr::new(format!("%{}%", escape_like_fragment(&value.to_lowercase())))
		.escape(LIKE_ESCAPE_CHAR)
}

/// `value%`, with `value` lowercased and escaped
pub(crate) fn like_starts_with(value: &str) -> LikeExpr {
	LikeExpr::new(format!("{}%", escape_like_fragment(&value.to_lowercase())))
		.escape(LIKE_ESCAPE_CHAR)
}

/// `%value`, with `value` lowercased and escaped
pub(crate) fn like_ends_with(value: &str) -> LikeExpr {
	LikeExpr::new(format!("%{}", escape_like_fragment(&value.to_lowercase())))
		.escape(LIKE_ESCAPE_CHAR)
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn escape_like_fragment_handles_wildcards() {
		assert_eq!(escape_like_fragment("50%"), r"50\%");
		assert_eq!(escape_like_fragment("file_name"), r"file\_name");
		assert_eq!(escape_like_fragment("100% true"), r"100\% true");
		assert_eq!(
			escape_like_fragment(r"already\escaped"),
			r"already\\escaped"
		);
	}

	#[test]
	fn escape_like_fragment_noop_for_safe_strings() {
		assert_eq!(escape_like_fragment("normal"), "normal");
		assert_eq!(escape_like_fragment("with spaces"), "with spaces");
	}
}
