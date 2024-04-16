//! Defines an interface for writing OPDS-complaint XML, based on the specification defined at
//! https://specs.opds.io/opds-1.2

pub mod author;
pub mod entry;
pub mod feed;
pub mod link;
pub mod opensearch;
pub mod util;

#[cfg(test)]
mod tests {
	use regex::Regex;

	/// A utility function for stripping whitespace from XML strings to
	/// make writing expected test results more ergonomic.
	pub fn normalize_xml(xml: &str) -> String {
		// Match whitespace between XML tags and replace it with "><"
		let re = Regex::new(r">\s+<").unwrap();
		let compacted = re.replace_all(xml, "><").to_string();

		// Do interior normalization and return the result
		interior_normalize_xml(compacted.trim())
	}

	/// Normalizes XML by removing newlines and tabs from within tags.
	fn interior_normalize_xml(xml: &str) -> String {
		let re_tags = Regex::new(r"<[^>]+>").unwrap(); // Matches the entire tag

		// First we replace all \n and \t characters with spaces
		let normalized_xml = re_tags
			.replace_all(xml, |caps: &regex::Captures| {
				caps[0].replace('\n', " ").replace('\t', " ")
			})
			.to_string();
		let partially_cleaned = normalized_xml.trim();
		// Then we make sure there aren't any more double spaces
		let re = Regex::new(r"\s{2,}").unwrap(); // Matches sequences of two or more whitespace characters
		re.replace_all(partially_cleaned, " ").to_string()
	}
}
