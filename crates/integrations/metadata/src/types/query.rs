#[derive(Debug, Clone)]
pub struct SearchQuery {
	pub title: String,
	pub author: Option<String>,
	pub isbn: Option<String>,
	pub year: Option<i32>,
	pub limit: Option<u32>,
}

impl Default for SearchQuery {
	fn default() -> Self {
		Self {
			title: String::new(),
			author: None,
			isbn: None,
			year: None,
			limit: Some(10),
		}
	}
}
