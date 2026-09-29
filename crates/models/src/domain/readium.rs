use std::collections::HashMap;

use crate::shared::readium::{RWPMPosition, ReadiumLocator};

fn filter_valid_titles(chapter_titles: Vec<String>) -> Vec<String> {
	chapter_titles
		.into_iter()
		.filter(|title| !title.trim().is_empty())
		.collect()
}

/// Returns a list of chapter titles between two locators, inclusive
#[tracing::instrument(skip(positions), fields(start = ?start.chapter_title, end = ?end.chapter_title, positions = positions.len()))]
pub fn chapters_between_locators(
	start: &ReadiumLocator,
	end: &ReadiumLocator,
	positions: &[RWPMPosition],
) -> Vec<String> {
	if start.chapter_title == end.chapter_title {
		return filter_valid_titles(vec![start.chapter_title.clone()]);
	}

	let chapter_to_index = positions
		.iter()
		.enumerate()
		.filter_map(|(index, pos)| {
			if let Some(chapter_title) = &pos.title {
				Some((chapter_title.clone(), index))
			} else {
				None
			}
		})
		.collect::<HashMap<_, _>>();

	let Some(start_index) = chapter_to_index.get(&start.chapter_title).copied() else {
		tracing::warn!(
			?start.chapter_title,
			"start position chapter was not found in positions"
		);
		return filter_valid_titles(vec![
			start.chapter_title.clone(),
			end.chapter_title.clone(),
		]);
	};

	let Some(end_index) = chapter_to_index.get(&end.chapter_title).copied() else {
		return filter_valid_titles(vec![
			start.chapter_title.clone(),
			end.chapter_title.clone(),
		]);
		// ^ we found the start so safe to include, but cannot really provide any kind
		// of range without the end
	};

	let chapter_range = if start_index <= end_index {
		start_index..=end_index
		// ^ normal case reading forward
	} else {
		end_index..=start_index
		// ^ this can happen while jumping around or going back
	};

	filter_valid_titles(
		positions[chapter_range]
			.iter()
			.filter_map(|pos| pos.title.clone())
			.collect(),
	)
}
