/// A potential match from an external provider
#[derive(Debug, Clone)]
pub struct MatchCandidate {
	/// The provider this match came from
	pub provider: &'static str,
	/// External ID on the provider's system
	pub external_id: String,
	pub title: String,
	pub alternative_titles: Vec<String>,
	pub cover_url: Option<String>,
	pub year: Option<i32>,
	pub authors: Vec<String>,
	pub description: Option<String>,
	// TODO: No fucking idea how to approach scoring/confidence yet. I'll focus
	// on fetching and shit first. Rough ideas are:
	// pub confidence: f32, // (0.0 - 1.0)
	// pub confidence_factors: Vec<ConfidenceFactor>,
}

impl Default for MatchCandidate {
	fn default() -> Self {
		Self {
			provider: "",
			external_id: "".to_string(),
			title: "".to_string(),
			alternative_titles: vec![],
			cover_url: None,
			year: None,
			authors: vec![],
			description: None,
		}
	}
}

// pub struct ConfidenceFactor {
// 	pub factor: String,
// 	pub weight: f32,
// 	pub matched: bool,
// }
