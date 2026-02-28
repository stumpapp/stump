use crate::types::{ConfidenceFactor, ExternalMetadata, MatchCandidate, SearchQuery};

// Note: This is really iffy right now! I've mostly been running a bunch of tests to try and get
// a baseline to normalize against. I expect this to change as the feature actually gets used

// TODO: If we have an author and none in the candidate, should we penalize the confidence?

/// Scores match candidates against a search query using confidence levels
///
/// The scorer uses signals to map candidates to a confidence floor:
///
/// | Signal             | Confidence |
/// |--------------------|------------|
/// | ISBN exact match   | ≥ 0.98     |
/// | Title exact        | ≥ 0.90     |
/// | Alt-title match    | ≥ 0.80     |
/// | Title fuzzy        | 0 .. 0.75  |
/// | Author match       | +0.05      |
///
/// The logic here is that:
/// - An ISBN match is pretty much definitive, at least to my knowledge
/// - An exact title match is set to high, even though it has more chance of false positives
/// - An alternative title match is set to a lower confidence floor than an exact title match
/// - Fuzzy matches are given a confidence score between 0 and 0.75, depending on the similarity
/// - If any of the above signals match, there exists a "boost" to the confidence score if the author also matches
///
///
/// Note: Fuzzy matching uses [Dice-Sørensen](https://en.wikipedia.org/wiki/Dice-S%C3%B8rensen_coefficient)
/// and [Jaro-Winkler](https://en.wikipedia.org/wiki/Jaro%E2%80%93Winkler_distance). This is NOT my wheelhouse
/// but from what I can tell, these are reasonable starting points
#[derive(Debug, Clone, Copy)]
pub struct MatchScorer;

impl MatchScorer {
	const ISBN_FLOOR: f32 = 0.98;
	const EXACT_TITLE_FLOOR: f32 = 0.90;
	const ALT_TITLE_FLOOR: f32 = 0.80;
	const FUZZY_CEILING: f32 = 0.75;
	const FUZZY_THRESHOLD: f64 = 0.70;
	const AUTHOR_BONUS: f32 = 0.05;

	/// Score a single candidate against the search query, populating its
	/// `confidence` and `confidence_factors` fields in place
	pub fn score_candidate(&self, query: &SearchQuery, candidate: &mut MatchCandidate) {
		let mut factors = Vec::new();

		let (candidate_title, candidate_alt_titles, candidate_authors) =
			Self::extract_candidate_fields(&candidate.metadata);

		let author_matched = query
			.author
			.as_ref()
			.is_some_and(|qa| candidate_authors.iter().any(|a| Self::names_match(qa, a)));

		if query.author.is_some() {
			factors.push(ConfidenceFactor {
				factor: "author".into(),
				weight: Self::AUTHOR_BONUS,
				matched: author_matched,
			});
		}

		let author_bonus = if author_matched {
			Self::AUTHOR_BONUS
		} else {
			0.0
		};

		if let Some(ref isbn) = query.isbn {
			let matched = Self::check_isbn_match(isbn, &candidate.metadata);
			factors.push(ConfidenceFactor {
				factor: "isbn".into(),
				weight: Self::ISBN_FLOOR,
				matched,
			});
			// Note: This is strong enough to just short-circuit the scoring imo
			if matched {
				candidate.confidence = (Self::ISBN_FLOOR + author_bonus).min(1.0);
				candidate.confidence_factors = factors;
				return;
			}
		}

		let (title_score, title_factors) = Self::score_title(
			&query.title,
			candidate_title.as_deref().unwrap_or(""),
			&candidate_alt_titles,
		);
		factors.extend(title_factors);

		candidate.confidence = (title_score + author_bonus).min(1.0);
		candidate.confidence_factors = factors;
	}

	/// Score and sort candidates by confidence descending
	pub fn score_and_sort(&self, query: &SearchQuery, candidates: &mut [MatchCandidate]) {
		for candidate in candidates.iter_mut() {
			self.score_candidate(query, candidate);
		}
		candidates.sort_by(|a, b| {
			b.confidence
				.partial_cmp(&a.confidence)
				.unwrap_or(std::cmp::Ordering::Equal)
		});
	}

	fn score_title(
		query_title: &str,
		candidate_title: &str,
		alt_titles: &[String],
	) -> (f32, Vec<ConfidenceFactor>) {
		if query_title.eq_ignore_ascii_case(candidate_title) {
			return (
				Self::EXACT_TITLE_FLOOR,
				vec![ConfidenceFactor {
					factor: "title_exact".into(),
					weight: Self::EXACT_TITLE_FLOOR,
					matched: true,
				}],
			);
		}

		for alt in alt_titles {
			if query_title.eq_ignore_ascii_case(alt) {
				return (
					Self::ALT_TITLE_FLOOR,
					vec![ConfidenceFactor {
						factor: "title_alt".into(),
						weight: Self::ALT_TITLE_FLOOR,
						matched: true,
					}],
				);
			}
		}

		let q_lower = query_title.to_lowercase();
		let c_lower = candidate_title.to_lowercase();
		let dice = strsim::sorensen_dice(&q_lower, &c_lower);
		let jw = strsim::jaro_winkler(&q_lower, &c_lower);
		let sim = dice.max(jw);

		let fuzzy_score = if sim >= Self::FUZZY_THRESHOLD {
			// Note: This is a linear scaling from the threshold to the ceiling, so
			// a similarity of FUZZY_THRESHOLD maps to 0, and a similarity of 1.0 maps to FUZZY_CEILING
			let t = (sim - Self::FUZZY_THRESHOLD) / (1.0 - Self::FUZZY_THRESHOLD);
			Self::FUZZY_CEILING * t as f32
		} else {
			0.0
		};

		(
			fuzzy_score,
			vec![ConfidenceFactor {
				factor: "title_fuzzy".into(),
				weight: fuzzy_score,
				matched: fuzzy_score > 0.0,
			}],
		)
	}

	fn names_match(a: &str, b: &str) -> bool {
		if a.eq_ignore_ascii_case(b) {
			return true;
		}
		strsim::jaro_winkler(&a.to_lowercase(), &b.to_lowercase()) > 0.90
	}

	fn check_isbn_match(query_isbn: &str, metadata: &ExternalMetadata) -> bool {
		match metadata {
			ExternalMetadata::Media(m) => {
				m.isbn.as_deref() == Some(query_isbn)
					|| m.isbn_13.as_deref() == Some(query_isbn)
			},
			ExternalMetadata::Series(_) => false,
		}
	}

	fn extract_candidate_fields(
		metadata: &ExternalMetadata,
	) -> (Option<String>, Vec<String>, Vec<String>) {
		match metadata {
			ExternalMetadata::Series(s) => (
				Some(s.title.clone()),
				s.alternative_titles.clone(),
				s.authors.clone().unwrap_or_default(),
			),
			ExternalMetadata::Media(m) => (
				m.title.clone(),
				Vec::new(),
				m.writers.clone().unwrap_or_default(),
			),
		}
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::types::{ExternalMediaMetadata, ExternalSeriesMetadata, MatchCandidate};

	fn make_series_candidate(title: &str, authors: Vec<String>) -> MatchCandidate {
		MatchCandidate {
			provider: "test".into(),
			external_id: "1".into(),
			metadata: ExternalMetadata::Series(ExternalSeriesMetadata {
				title: title.to_string(),
				authors: Some(authors),
				..Default::default()
			}),
			confidence: 0.0,
			confidence_factors: Vec::new(),
		}
	}

	fn make_media_candidate(
		title: &str,
		isbn: Option<&str>,
		writers: Vec<String>,
	) -> MatchCandidate {
		MatchCandidate {
			provider: "test".into(),
			external_id: "1".into(),
			metadata: ExternalMetadata::Media(ExternalMediaMetadata {
				title: Some(title.to_string()),
				isbn: isbn.map(|s| s.to_string()),
				writers: Some(writers),
				..Default::default()
			}),
			confidence: 0.0,
			confidence_factors: Vec::new(),
		}
	}

	#[test]
	fn isbn_match_scores_at_least_098() {
		let scorer = MatchScorer;
		let query = SearchQuery {
			title: "Irrelevant".into(),
			isbn: Some("978-0-06-224239-5".into()),
			..Default::default()
		};
		let mut c =
			make_media_candidate("Wrong Title", Some("978-0-06-224239-5"), vec![]);
		scorer.score_candidate(&query, &mut c);

		assert!(
			c.confidence >= 0.98,
			"ISBN match should be ≥ 0.98, got {}",
			c.confidence
		);
		assert!(c.confidence_factors.iter().any(|f| f.factor == "isbn"));
	}

	#[test]
	fn isbn_match_with_author_reaches_1() {
		let scorer = MatchScorer;
		let query = SearchQuery {
			title: "The Long Way to a Small, Angry Planet".into(),
			isbn: Some("978-0-06-224439-9".into()),
			author: Some("Becky Chambers".into()),
			..Default::default()
		};
		let mut c = make_media_candidate(
			"The Long Way to a Small, Angry Planet",
			Some("978-0-06-224439-9"),
			vec!["Becky Chambers".into()],
		);
		scorer.score_candidate(&query, &mut c);

		assert!(
			(c.confidence - 1.0).abs() < f32::EPSILON,
			"ISBN + author should reach 1.0, got {}",
			c.confidence
		);
	}

	#[test]
	fn exact_title_scores_090() {
		let scorer = MatchScorer;
		let query = SearchQuery {
			title: "Wayfarers".into(),
			..Default::default()
		};
		let mut c = make_series_candidate("Wayfarers", vec![]);
		scorer.score_candidate(&query, &mut c);

		assert!(
			(c.confidence - MatchScorer::EXACT_TITLE_FLOOR).abs() < 0.01,
			"Expected ~{}, got {}",
			MatchScorer::EXACT_TITLE_FLOOR,
			c.confidence
		);
		assert!(c
			.confidence_factors
			.iter()
			.any(|f| f.factor == "title_exact"));
	}

	#[test]
	fn exact_title_with_author_scores_095() {
		let scorer = MatchScorer;
		let query = SearchQuery {
			title: "Wayfarers".into(),
			author: Some("Becky Chambers".into()),
			..Default::default()
		};
		let mut c = make_series_candidate("Wayfarers", vec!["Becky Chambers".into()]);
		scorer.score_candidate(&query, &mut c);

		let expected = MatchScorer::EXACT_TITLE_FLOOR + MatchScorer::AUTHOR_BONUS;
		assert!(
			(c.confidence - expected).abs() < 0.01,
			"Expected ~{}, got {}",
			expected,
			c.confidence
		);
	}

	#[test]
	fn article_difference_falls_to_fuzzy() {
		let scorer = MatchScorer;
		let query = SearchQuery {
			title: "The Long Way to a Small, Angry Planet".into(),
			..Default::default()
		};
		let mut c = make_series_candidate("Long Way to a Small, Angry Planet", vec![]);
		scorer.score_candidate(&query, &mut c);

		// Not an exact match, so it falls to fuzzyy and should still score reasonably
		assert!(
			c.confidence > 0.0 && c.confidence < MatchScorer::ALT_TITLE_FLOOR,
			"Expected fuzzy range, got {}",
			c.confidence
		);
	}

	#[test]
	fn author_adds_bonus() {
		let scorer = MatchScorer;
		let query = SearchQuery {
			title: "Wayfarers".into(),
			author: Some("Becky Chambers".into()),
			..Default::default()
		};

		let mut with_author =
			make_series_candidate("Wayfarers", vec!["Becky Chambers".into()]);
		let mut without_author = make_series_candidate("Wayfarers", vec![]);

		scorer.score_candidate(&query, &mut with_author);
		scorer.score_candidate(&query, &mut without_author);

		let diff = with_author.confidence - without_author.confidence;
		assert!(
			(diff - MatchScorer::AUTHOR_BONUS).abs() < 0.01,
			"Author bonus should be ~{}, got diff {}",
			MatchScorer::AUTHOR_BONUS,
			diff
		);
	}

	#[test]
	fn unrelated_title_scores_near_zero() {
		let scorer = MatchScorer;
		let query = SearchQuery {
			title: "A Psalm for the Wild-Built".into(),
			..Default::default()
		};
		let mut c = make_series_candidate("Completely Different Title", vec![]);
		scorer.score_candidate(&query, &mut c);

		assert!(c.confidence < 0.05, "Got {}", c.confidence);
	}

	#[test]
	fn fuzzy_title_caps_below_alt_title() {
		let scorer = MatchScorer;
		let query = SearchQuery {
			title: "A Psalm for the Wild-Built".into(),
			..Default::default()
		};
		let mut c = make_series_candidate("A Psalm for the Wild Built", vec![]); // typo (hyphen missing)
		scorer.score_candidate(&query, &mut c);

		assert!(
			c.confidence < MatchScorer::ALT_TITLE_FLOOR,
			"Fuzzy should stay below alt-title floor, got {}",
			c.confidence
		);
		assert!(c.confidence > 0.0, "Should still get some fuzzy score");
	}

	#[test]
	fn score_and_sort_orders_by_confidence() {
		let scorer = MatchScorer;
		let query = SearchQuery {
			title: "Wayfarers".into(),
			..Default::default()
		};

		let mut candidates = vec![
			make_series_candidate("Something Else", vec![]),
			make_series_candidate("Wayfarers", vec![]),
			make_series_candidate("Wayferers", vec![]), // typo ("e" -> "a")
		];

		scorer.score_and_sort(&query, &mut candidates);

		assert_eq!(
			candidates[0].metadata.as_series().map(|s| s.title.as_str()),
			Some("Wayfarers"),
		);
		assert!(candidates[0].confidence >= candidates[1].confidence);
		assert!(candidates[1].confidence >= candidates[2].confidence);
	}
}
