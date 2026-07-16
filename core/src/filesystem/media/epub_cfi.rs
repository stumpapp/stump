//! Best-effort EPUB CFI → Readium locator resolution for legacy progress/bookmarks.
//!
//! Does not mutate stored data. Parses the package component to identify a spine
//! resource, then carries the content (local) component as `partialCfi`.

use std::{collections::HashMap, fs::File, io::BufReader};

use epub::doc::EpubDoc;

use crate::filesystem::media::readium::{
	enumerate_spine_for_positions_at, rwpm_resource_url, SpinePositionMeta,
};

pub const EPUB_CFI_MAX_LEN: usize = 8_192;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum EpubCfiResolveError {
	InvalidFormat,
	TooLong,
	MissingContentComponent,
	SpineNotFound,
	OpenFailed(String),
}

impl std::fmt::Display for EpubCfiResolveError {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		match self {
			Self::InvalidFormat => write!(f, "invalid epubcfi string"),
			Self::TooLong => write!(f, "epubcfi exceeds maximum length"),
			Self::MissingContentComponent => {
				write!(f, "epubcfi missing content component")
			},
			Self::SpineNotFound => write!(f, "could not map epubcfi to spine item"),
			Self::OpenFailed(msg) => write!(f, "failed to open epub: {msg}"),
		}
	}
}

/// Resolved Readium-shaped locator payload (JSON-serializable at the HTTP boundary).
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedEpubCfiLocator {
	pub href: String,
	#[serde(rename = "type")]
	pub media_type: String,
	pub chapter_title: String,
	pub locations: ResolvedEpubCfiLocations,
}

#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedEpubCfiLocations {
	pub partial_cfi: String,
	pub position: Option<i32>,
	pub total_progression: Option<f64>,
}

/// Parse and resolve a legacy full `epubcfi(...)` string against an on-disk EPUB.
pub fn resolve_epub_cfi(
	epub_path: &str,
	base_url: &str,
	cfi: &str,
) -> Result<ResolvedEpubCfiLocator, EpubCfiResolveError> {
	let (package, content) = parse_epub_cfi_parts(cfi)?;

	let mut epub = EpubDoc::new(epub_path)
		.map_err(|e| EpubCfiResolveError::OpenFailed(e.to_string()))?;
	let spine = enumerate_spine_for_positions_at(&mut epub)
		.map_err(|e| EpubCfiResolveError::OpenFailed(e.to_string()))?;

	let spine_item = map_package_to_spine(&package, &spine, &epub)?;

	Ok(ResolvedEpubCfiLocator {
		href: rwpm_resource_url(base_url, &spine_item.package_path),
		media_type: spine_item.media_type.clone(),
		chapter_title: spine_item.title.clone().unwrap_or_default(),
		locations: ResolvedEpubCfiLocations {
			partial_cfi: content,
			position: Some(spine_item.position as i32),
			total_progression: Some(spine_item.total_progression),
		},
	})
}

fn parse_epub_cfi_parts(cfi: &str) -> Result<(String, String), EpubCfiResolveError> {
	if cfi.len() > EPUB_CFI_MAX_LEN {
		return Err(EpubCfiResolveError::TooLong);
	}
	let trimmed = cfi.trim();
	if !trimmed.starts_with("epubcfi(") || !trimmed.ends_with(')') {
		return Err(EpubCfiResolveError::InvalidFormat);
	}
	let inner = &trimmed["epubcfi(".len()..trimmed.len() - 1];
	let (package, content) = inner
		.split_once('!')
		.ok_or(EpubCfiResolveError::MissingContentComponent)?;
	if package.is_empty() || content.is_empty() {
		return Err(EpubCfiResolveError::InvalidFormat);
	}
	Ok((package.to_string(), content.to_string()))
}

fn map_package_to_spine(
	package: &str,
	spine: &[SpinePositionMeta],
	epub: &EpubDoc<BufReader<File>>,
) -> Result<SpinePositionMeta, EpubCfiResolveError> {
	if let Some(id) = extract_id_assertion(package) {
		if let Some(item) = spine_by_idref(spine, epub, &id) {
			return Ok(item);
		}
	}

	if let Some(index) = spine_index_from_package_path(package) {
		if let Some(item) = spine.get(index) {
			return Ok(item.clone());
		}
	}

	Err(EpubCfiResolveError::SpineNotFound)
}

fn extract_id_assertion(path: &str) -> Option<String> {
	let start = path.rfind('[')? + 1;
	let end = path[start..].find(']')? + start;
	Some(path[start..end].to_string())
}

/// Heuristic: `/6/N` where N is even often indexes spine items (N/2 - 1).
fn spine_index_from_package_path(package: &str) -> Option<usize> {
	let mut last_step: Option<usize> = None;
	for segment in package.split('/') {
		if let Ok(step) = segment.parse::<usize>() {
			if step % 2 == 0 {
				last_step = Some(step);
			}
		}
	}
	last_step.and_then(|step| step.checked_div(2).and_then(|n| n.checked_sub(1)))
}

fn spine_by_idref(
	spine: &[SpinePositionMeta],
	epub: &EpubDoc<BufReader<File>>,
	id: &str,
) -> Option<SpinePositionMeta> {
	let id_to_index: HashMap<&str, usize> = epub
		.spine
		.iter()
		.enumerate()
		.map(|(i, item)| (item.idref.as_str(), i))
		.collect();

	let spine_index = id_to_index.get(id).copied()?;
	spine
		.iter()
		.find(|item| item.spine_index == spine_index)
		.cloned()
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn parses_full_cfi() {
		let (pkg, content) =
			parse_epub_cfi_parts("epubcfi(/6/4!/4[id]/2/1:0)").expect("parse");
		assert_eq!(pkg, "/6/4");
		assert_eq!(content, "/4[id]/2/1:0");
	}

	#[test]
	fn rejects_invalid_wrapper() {
		assert!(matches!(
			parse_epub_cfi_parts("/6/4!/4"),
			Err(EpubCfiResolveError::InvalidFormat)
		));
	}

	#[test]
	fn resolves_fixture_epub_by_spine_step() {
		let epub_path = crate::filesystem::media::tests::get_test_epub_path();
		let base = "https://example.test/api/v2/epub/book-id";
		// book.epub fixture: first spine item is typically /6/2 in epub.js-style CFIs
		let resolved = resolve_epub_cfi(&epub_path, base, "epubcfi(/6/2!/4/2/1:0)")
			.expect("resolve");
		assert!(resolved.href.contains("/resource/"));
		assert_eq!(resolved.locations.partial_cfi, "/4/2/1:0");
		assert!(resolved.locations.position.is_some());
	}
}
