use serde::{Deserialize, Serialize};

use super::ExternalMetadata;

/// A potential match from an external provider
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchCandidate {
	/// The provider this match came from
	pub provider: String,
	/// External ID on the provider's system
	pub external_id: String,
	pub metadata: ExternalMetadata,
	// TODO: Confidence scoring
	// pub confidence: f32, // (0.0 - 1.0)
	// pub confidence_factors: Vec<ConfidenceFactor>,
}

// pub struct ConfidenceFactor {
// 	pub factor: String,
// 	pub weight: f32,
// 	pub matched: bool,
// }
