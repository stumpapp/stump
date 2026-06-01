use std::collections::HashMap;

// TODO: maybe make it self constructing? e.g. async build() which takes a db conn and
// prepops with all tags?

/// a scan-wide cache mapping tag name to tag ID. added to reduce the number of trips
/// to the database for tags which are likely to be shared across many books
#[derive(Debug, Default)]
pub(crate) struct TagCache(HashMap<String, i32>);

impl TagCache {
	pub fn new() -> Self {
		Self::default()
	}

	/// returns the cached ID for given `name`, if exists
	pub fn get(&self, name: &str) -> Option<i32> {
		self.0.get(name).copied()
	}

	/// returns `true` if given `name` is already in the cache
	pub fn contains(&self, name: &str) -> bool {
		self.0.contains_key(name)
	}

	/// inserts a name -> id mapping
	pub fn insert(&mut self, name: String, id: i32) {
		self.0.insert(name, id);
	}
}
