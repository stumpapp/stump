use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct SearchQuery {
	pub title: String,
	pub author: Option<String>,
	pub isbn: Option<String>,
	pub year: Option<i32>,
	pub limit: Option<u32>,
	/// The issue number and/or position within a series
	pub number: Option<f32>,
	/// Provider-specific hints that allow potentially higher-fidelity lookups.
	// ^ note: i was tempted to make this a more structured type, but until i know for sure what i need
	// spread across multiple (currently unimplemented) providers, it just felt easier to use a map here.
	// it could be good for consistency and less error-prone usage to make it an actual struct at some point
	pub provider_hints: HashMap<String, String>,
}

impl Default for SearchQuery {
	fn default() -> Self {
		Self {
			title: String::new(),
			author: None,
			isbn: None,
			year: None,
			limit: Some(10),
			number: None,
			provider_hints: HashMap::new(),
		}
	}
}
