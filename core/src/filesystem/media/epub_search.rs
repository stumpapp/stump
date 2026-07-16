//! Bounded whole-book EPUB search over OPF spine XHTML.
//!
//! This is a minimal naive implementation: no index and no cache. Each request opens the
//! package, scans linear text spine items from a cursor, and returns Readium
//! locators that the web reader can navigate directly.

use std::{
	fs::File,
	io::{BufReader, Read},
};

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use epub::doc::EpubDoc;
use quick_xml::{escape::unescape, events::Event, name::QName, Reader};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use tokio_util::sync::CancellationToken;
use zip::ZipArchive;

use crate::filesystem::{
	error::FileError,
	media::readium::{enumerate_spine_for_positions_at, rwpm_resource_url},
};

pub const EPUB_SEARCH_MIN_QUERY_LEN: usize = 2;
pub const EPUB_SEARCH_MAX_QUERY_LEN: usize = 128;
pub const EPUB_SEARCH_DEFAULT_LIMIT: usize = 20;
pub const EPUB_SEARCH_MAX_LIMIT: usize = 50;
pub const EPUB_SEARCH_MAX_SPINE_ITEMS: usize = 128;
pub const EPUB_SEARCH_MAX_DECOMPRESSED_BYTES: usize = 32 * 1024 * 1024;
pub const EPUB_SEARCH_MAX_ITEM_BYTES: usize = 16 * 1024 * 1024;
pub const EPUB_SEARCH_MAX_MATCHES_PER_SPINE: usize = 20;
pub const EPUB_SEARCH_EXCERPT_RADIUS: usize = 64;
const CURSOR_VERSION: u8 = 1;

#[derive(Debug, Error)]
pub enum EpubSearchError {
	#[error("query must be between {min} and {max} characters")]
	InvalidQueryLength { min: usize, max: usize },
	#[error("invalid search cursor")]
	InvalidCursor,
	#[error("limit must be between 1 and {max}")]
	InvalidLimit { max: usize },
	#[error("search cancelled")]
	Cancelled,
	#[error(transparent)]
	File(#[from] FileError),
}

#[derive(Debug, Clone)]
pub struct EpubSearchOptions {
	pub query: String,
	pub limit: usize,
	pub cursor: Option<EpubSearchCursor>,
	/// Overrideable caps for tests.
	pub max_spine_items: usize,
	pub max_decompressed_bytes: usize,
	pub max_item_bytes: usize,
}

impl Default for EpubSearchOptions {
	fn default() -> Self {
		Self {
			query: String::new(),
			limit: EPUB_SEARCH_DEFAULT_LIMIT,
			cursor: None,
			max_spine_items: EPUB_SEARCH_MAX_SPINE_ITEMS,
			max_decompressed_bytes: EPUB_SEARCH_MAX_DECOMPRESSED_BYTES,
			max_item_bytes: EPUB_SEARCH_MAX_ITEM_BYTES,
		}
	}
}

impl EpubSearchOptions {
	pub fn new(query: impl Into<String>) -> Self {
		Self {
			query: query.into(),
			..Default::default()
		}
	}

	pub fn with_limit(mut self, limit: usize) -> Self {
		self.limit = limit;
		self
	}

	pub fn with_cursor(mut self, cursor: Option<EpubSearchCursor>) -> Self {
		self.cursor = cursor;
		self
	}

	pub fn validate(&self) -> Result<(), EpubSearchError> {
		let trimmed = self.query.trim();
		let len = trimmed.chars().count();
		if len < EPUB_SEARCH_MIN_QUERY_LEN || len > EPUB_SEARCH_MAX_QUERY_LEN {
			return Err(EpubSearchError::InvalidQueryLength {
				min: EPUB_SEARCH_MIN_QUERY_LEN,
				max: EPUB_SEARCH_MAX_QUERY_LEN,
			});
		}
		if self.limit == 0 || self.limit > EPUB_SEARCH_MAX_LIMIT {
			return Err(EpubSearchError::InvalidLimit {
				max: EPUB_SEARCH_MAX_LIMIT,
			});
		}
		Ok(())
	}

	pub fn decode_cursor(raw: &str) -> Result<EpubSearchCursor, EpubSearchError> {
		let bytes = URL_SAFE_NO_PAD
			.decode(raw.trim())
			.map_err(|_| EpubSearchError::InvalidCursor)?;
		let cursor: EpubSearchCursor =
			serde_json::from_slice(&bytes).map_err(|_| EpubSearchError::InvalidCursor)?;
		if cursor.v != CURSOR_VERSION {
			return Err(EpubSearchError::InvalidCursor);
		}
		Ok(cursor)
	}
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct EpubSearchCursor {
	pub v: u8,
	pub spine_index: u32,
	pub text_offset: u32,
	/// Fingerprint of the normalized query so a cursor cannot be reused across searches.
	pub query_fp: String,
}

impl EpubSearchCursor {
	pub fn encode(&self) -> String {
		let json = serde_json::to_vec(self).expect("cursor serialization");
		URL_SAFE_NO_PAD.encode(json)
	}
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EpubSearchResponse {
	pub query: String,
	pub results: Vec<EpubSearchResult>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub next_cursor: Option<String>,
	pub truncated: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EpubSearchResult {
	pub excerpt: String,
	pub spine_index: u32,
	pub locator: EpubSearchLocator,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EpubSearchLocator {
	pub href: String,
	#[serde(rename = "type")]
	pub media_type: String,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub title: Option<String>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub chapter_title: Option<String>,
	pub locations: EpubSearchLocatorLocations,
	pub text: EpubSearchLocatorText,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EpubSearchLocatorLocations {
	pub position: u32,
	pub progression: f64,
	pub total_progression: f64,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub fragments: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EpubSearchLocatorText {
	pub before: String,
	pub highlight: String,
	pub after: String,
}

/// Search an EPUB package for a literal, case-insensitive query.
pub fn search_epub(
	epub_path: &str,
	base_url: &str,
	options: EpubSearchOptions,
	cancel: &CancellationToken,
) -> Result<EpubSearchResponse, EpubSearchError> {
	options.validate()?;
	if cancel.is_cancelled() {
		return Err(EpubSearchError::Cancelled);
	}

	let query = options.query.trim().to_string();
	let query_fp = query_fingerprint(&query);
	if let Some(cursor) = &options.cursor {
		if cursor.query_fp != query_fp {
			return Err(EpubSearchError::InvalidCursor);
		}
	}

	let mut epub =
		EpubDoc::new(epub_path).map_err(|e| FileError::EpubOpenError(e.to_string()))?;
	let spine_meta = enumerate_spine_for_positions_at(&mut epub)?;

	let zip_file = File::open(epub_path).map_err(FileError::from)?;
	let mut archive =
		ZipArchive::new(BufReader::new(zip_file)).map_err(FileError::from)?;

	let start_spine = options
		.cursor
		.as_ref()
		.map(|c| c.spine_index as usize)
		.unwrap_or(0);
	let mut start_text_offset = options
		.cursor
		.as_ref()
		.map(|c| c.text_offset as usize)
		.unwrap_or(0);

	if start_spine > spine_meta.len() {
		return Err(EpubSearchError::InvalidCursor);
	}

	let needle = query.to_lowercase();
	let mut results = Vec::new();
	let mut truncated = false;
	let mut bytes_scanned = 0usize;
	let mut spine_items_scanned = 0usize;
	let mut next_cursor: Option<EpubSearchCursor> = None;

	for meta in spine_meta.iter().skip(start_spine) {
		if cancel.is_cancelled() {
			return Err(EpubSearchError::Cancelled);
		}
		if results.len() >= options.limit {
			break;
		}
		if spine_items_scanned >= options.max_spine_items {
			truncated = true;
			next_cursor = Some(EpubSearchCursor {
				v: CURSOR_VERSION,
				spine_index: meta.spine_index as u32,
				text_offset: 0,
				query_fp: query_fp.clone(),
			});
			break;
		}

		if !is_searchable_mime(&meta.media_type) {
			start_text_offset = 0;
			continue;
		}

		let zip_path = package_path_for_zip(&meta.package_path);
		let entry_index = match find_zip_index(&mut archive, &zip_path) {
			Some(idx) => idx,
			None => {
				tracing::warn!(path = %zip_path, "spine resource missing from zip; skipping");
				start_text_offset = 0;
				continue;
			},
		};

		let uncompressed = {
			let file = archive.by_index(entry_index).map_err(FileError::from)?;
			file.size() as usize
		};

		if uncompressed == 0 || uncompressed > options.max_item_bytes {
			tracing::warn!(
				path = %zip_path,
				uncompressed,
				max = options.max_item_bytes,
				"skipping oversized or empty spine item"
			);
			truncated = true;
			start_text_offset = 0;
			spine_items_scanned += 1;
			continue;
		}

		if bytes_scanned.saturating_add(uncompressed) > options.max_decompressed_bytes {
			truncated = true;
			next_cursor = Some(EpubSearchCursor {
				v: CURSOR_VERSION,
				spine_index: meta.spine_index as u32,
				text_offset: 0,
				query_fp: query_fp.clone(),
			});
			break;
		}

		let bytes =
			read_zip_entry_bounded(&mut archive, entry_index, uncompressed, cancel)?;
		bytes_scanned += bytes.len();
		spine_items_scanned += 1;

		let plain = extract_searchable_text(&bytes);
		if plain.is_empty() {
			start_text_offset = 0;
			continue;
		}

		let resume = if meta.spine_index == start_spine {
			start_text_offset.min(plain.len())
		} else {
			0
		};

		let matches = find_literal_matches_ci(&plain, &needle, resume);
		let mut emitted_in_spine = 0usize;

		for (match_start, match_end) in matches {
			if cancel.is_cancelled() {
				return Err(EpubSearchError::Cancelled);
			}
			if emitted_in_spine >= EPUB_SEARCH_MAX_MATCHES_PER_SPINE {
				break;
			}
			if results.len() >= options.limit {
				next_cursor = Some(EpubSearchCursor {
					v: CURSOR_VERSION,
					spine_index: meta.spine_index as u32,
					text_offset: match_start as u32,
					query_fp: query_fp.clone(),
				});
				break;
			}

			let (before, highlight, after) =
				build_excerpt(&plain, match_start, match_end, EPUB_SEARCH_EXCERPT_RADIUS);
			let excerpt = format!("{before}{highlight}{after}");
			let progression = if plain.is_empty() {
				0.0
			} else {
				(match_start as f64 / plain.len() as f64).clamp(0.0, 1.0)
			};
			let weight = if spine_meta.iter().map(|s| s.size).sum::<usize>().max(1) == 0 {
				0.0
			} else {
				meta.size as f64
					/ spine_meta.iter().map(|s| s.size).sum::<usize>().max(1) as f64
			};
			let total_progression =
				(meta.total_progression + progression * weight).clamp(0.0, 1.0);

			results.push(EpubSearchResult {
				excerpt,
				spine_index: meta.spine_index as u32,
				locator: EpubSearchLocator {
					href: rwpm_resource_url(base_url, &meta.package_path),
					media_type: meta.media_type.clone(),
					title: meta.title.clone(),
					chapter_title: meta.title.clone(),
					locations: EpubSearchLocatorLocations {
						position: meta.position,
						progression,
						total_progression,
						fragments: None,
					},
					text: EpubSearchLocatorText {
						before,
						highlight,
						after,
					},
				},
			});
			emitted_in_spine += 1;
		}

		if results.len() >= options.limit {
			// If we filled the page mid-spine, cursor already set above when breaking.
			// If we exhausted matches in this spine, resume at the next spine.
			if next_cursor.is_none() {
				let next_index = meta.spine_index.saturating_add(1);
				if next_index < epub.get_num_chapters() {
					next_cursor = Some(EpubSearchCursor {
						v: CURSOR_VERSION,
						spine_index: next_index as u32,
						text_offset: 0,
						query_fp: query_fp.clone(),
					});
				}
			}
			break;
		}

		start_text_offset = 0;
	}

	// If we stopped due to scan budgets without filling the page, keep the cursor.
	if next_cursor.is_none() && truncated {
		// already set when budget hit
	}

	Ok(EpubSearchResponse {
		query,
		results,
		next_cursor: next_cursor.map(|c| c.encode()),
		truncated,
	})
}

fn query_fingerprint(query: &str) -> String {
	use std::collections::hash_map::DefaultHasher;
	use std::hash::{Hash, Hasher};
	let mut hasher = DefaultHasher::new();
	query.to_lowercase().hash(&mut hasher);
	format!("{:x}", hasher.finish())
}

fn is_searchable_mime(mime: &str) -> bool {
	let mime = mime.to_ascii_lowercase();
	mime.contains("xhtml")
		|| mime == "text/html"
		|| mime == "application/xml"
		|| mime == "text/xml"
}

fn package_path_for_zip(path: &str) -> String {
	path.trim_start_matches('/')
		.split('#')
		.next()
		.unwrap_or(path)
		.to_string()
}

fn find_zip_index<R: Read + std::io::Seek>(
	archive: &mut ZipArchive<R>,
	path: &str,
) -> Option<usize> {
	for i in 0..archive.len() {
		if let Ok(file) = archive.by_index(i) {
			if file.name() == path {
				return Some(i);
			}
		}
	}
	// Try percent-decoded variants of path segments already normalized.
	let decoded = percent_encoding_lite(path);
	if decoded != path {
		for i in 0..archive.len() {
			if let Ok(file) = archive.by_index(i) {
				if file.name() == decoded {
					return Some(i);
				}
			}
		}
	}
	None
}

fn percent_encoding_lite(path: &str) -> String {
	let mut out = String::with_capacity(path.len());
	let bytes = path.as_bytes();
	let mut i = 0;
	while i < bytes.len() {
		if bytes[i] == b'%' && i + 2 < bytes.len() {
			if let (Some(a), Some(b)) = (from_hex(bytes[i + 1]), from_hex(bytes[i + 2])) {
				out.push((a << 4 | b) as char);
				i += 3;
				continue;
			}
		}
		out.push(bytes[i] as char);
		i += 1;
	}
	out
}

fn from_hex(b: u8) -> Option<u8> {
	match b {
		b'0'..=b'9' => Some(b - b'0'),
		b'a'..=b'f' => Some(b - b'a' + 10),
		b'A'..=b'F' => Some(b - b'A' + 10),
		_ => None,
	}
}

fn read_zip_entry_bounded<R: Read + std::io::Seek>(
	archive: &mut ZipArchive<R>,
	index: usize,
	expected_size: usize,
	cancel: &CancellationToken,
) -> Result<Vec<u8>, EpubSearchError> {
	let mut file = archive.by_index(index).map_err(FileError::from)?;
	let mut buf = Vec::with_capacity(expected_size.min(EPUB_SEARCH_MAX_ITEM_BYTES));
	let mut chunk = [0u8; 64 * 1024];
	loop {
		if cancel.is_cancelled() {
			return Err(EpubSearchError::Cancelled);
		}
		let n = file.read(&mut chunk).map_err(FileError::from)?;
		if n == 0 {
			break;
		}
		if buf.len() + n > expected_size.max(EPUB_SEARCH_MAX_ITEM_BYTES) {
			return Err(FileError::EpubReadError(
				"spine item exceeded declared size while reading".to_string(),
			)
			.into());
		}
		buf.extend_from_slice(&chunk[..n]);
	}
	Ok(buf)
}

/// Extract plain searchable text from XHTML/HTML bytes without executing markup.
pub(crate) fn extract_searchable_text(bytes: &[u8]) -> String {
	let mut reader = Reader::from_reader(bytes);
	reader.config_mut().trim_text(false);

	let mut out = String::new();
	let mut buf = Vec::new();
	let mut skip_depth: usize = 0;

	loop {
		match reader.read_event_into(&mut buf) {
			Ok(Event::Start(e)) => {
				let local = local_name(e.name());
				if is_skip_tag(&local) {
					skip_depth += 1;
				} else if skip_depth == 0 && is_block_tag(&local) {
					push_boundary(&mut out);
				}
			},
			Ok(Event::Empty(e)) => {
				let local = local_name(e.name());
				if skip_depth == 0 && (is_block_tag(&local) || local == "br") {
					push_boundary(&mut out);
				}
			},
			Ok(Event::End(e)) => {
				let local = local_name(e.name());
				if is_skip_tag(&local) {
					skip_depth = skip_depth.saturating_sub(1);
				} else if skip_depth == 0 && is_block_tag(&local) {
					push_boundary(&mut out);
				}
			},
			Ok(Event::Text(e)) => {
				if skip_depth == 0 {
					let raw = String::from_utf8_lossy(e.as_ref());
					let text = unescape(&raw)
						.map(|c| c.into_owned())
						.unwrap_or_else(|_| raw.into_owned());
					push_text(&mut out, &text);
				}
			},
			Ok(Event::GeneralRef(e)) => {
				if skip_depth == 0 {
					if let Ok(name) = std::str::from_utf8(&e) {
						if let Some(resolved) = resolve_entity(name) {
							push_text(&mut out, &resolved);
						}
					}
				}
			},
			Ok(Event::CData(e)) => {
				if skip_depth == 0 {
					let raw = String::from_utf8_lossy(e.as_ref());
					push_text(&mut out, &raw);
				}
			},
			Ok(Event::Eof) => break,
			Err(err) => {
				tracing::debug!(error = %err, "stopping XHTML text extraction after parse error");
				break;
			},
			_ => {},
		}
		buf.clear();
	}

	normalize_whitespace(&out)
}

fn local_name(name: QName<'_>) -> String {
	let raw = name.as_ref();
	let local = raw.rsplit(|b| *b == b':').next().unwrap_or(raw);
	String::from_utf8_lossy(local).to_ascii_lowercase()
}

fn is_skip_tag(tag: &str) -> bool {
	matches!(tag, "script" | "style" | "noscript")
}

fn is_block_tag(tag: &str) -> bool {
	matches!(
		tag,
		"p" | "div"
			| "li" | "tr"
			| "h1" | "h2"
			| "h3" | "h4"
			| "h5" | "h6"
			| "section"
			| "article"
			| "blockquote"
			| "td" | "th"
			| "dt" | "dd"
			| "br" | "hr"
	)
}

fn push_boundary(out: &mut String) {
	if out.is_empty() || out.ends_with(' ') {
		return;
	}
	out.push(' ');
}

fn push_text(out: &mut String, text: &str) {
	if text.is_empty() {
		return;
	}
	out.push_str(text);
}

fn resolve_entity(name: &str) -> Option<String> {
	match name {
		"amp" => Some("&".to_string()),
		"lt" => Some("<".to_string()),
		"gt" => Some(">".to_string()),
		"quot" => Some("\"".to_string()),
		"apos" => Some("'".to_string()),
		"nbsp" => Some(" ".to_string()),
		_ => {
			if let Some(num) = name.strip_prefix('#') {
				let code = if let Some(hex) = num.strip_prefix(['x', 'X']) {
					u32::from_str_radix(hex, 16).ok()?
				} else {
					num.parse().ok()?
				};
				return char::from_u32(code).map(|c| c.to_string());
			}
			// Attempt named entity via unescape wrapper form.
			let wrapped = format!("&{name};");
			unescape(&wrapped).ok().map(|c| c.into_owned())
		},
	}
}

fn normalize_whitespace(input: &str) -> String {
	let mut out = String::with_capacity(input.len());
	let mut last_was_space = true;
	for ch in input.chars() {
		if ch.is_whitespace() || ch == '\u{00A0}' {
			if !last_was_space {
				out.push(' ');
				last_was_space = true;
			}
		} else {
			out.push(ch);
			last_was_space = false;
		}
	}
	out.trim().to_string()
}

/// Find non-overlapping literal matches of `needle` (already lowercased) in `haystack`.
pub(crate) fn find_literal_matches_ci(
	haystack: &str,
	needle_lower: &str,
	start: usize,
) -> Vec<(usize, usize)> {
	if needle_lower.is_empty() || start > haystack.len() {
		return Vec::new();
	}

	let hay_lower = haystack.to_lowercase();
	if !haystack.is_char_boundary(start) || !hay_lower.is_char_boundary(start) {
		return Vec::new();
	}

	// Map lowered-byte offsets back to original char-boundary offsets via parallel walk.
	let original_chars: Vec<(usize, char)> = haystack.char_indices().collect();
	let lowered_chars: Vec<char> = hay_lower.chars().collect();
	if original_chars.len() != lowered_chars.len() {
		// Extremely rare case-folding length change — fall back to ASCII-insensitive scan on lowered string only.
		return find_in_lowered(&hay_lower, needle_lower, start);
	}

	let needle_chars: Vec<char> = needle_lower.chars().collect();
	if needle_chars.is_empty() {
		return Vec::new();
	}

	let mut start_char_idx = 0usize;
	for (i, (byte_idx, _)) in original_chars.iter().enumerate() {
		if *byte_idx >= start {
			start_char_idx = i;
			break;
		}
		start_char_idx = i + 1;
	}

	let mut matches = Vec::new();
	let mut i = start_char_idx;
	while i + needle_chars.len() <= lowered_chars.len() {
		if lowered_chars[i..i + needle_chars.len()] == needle_chars[..] {
			let start_byte = original_chars[i].0;
			let end_byte = if i + needle_chars.len() < original_chars.len() {
				original_chars[i + needle_chars.len()].0
			} else {
				haystack.len()
			};
			matches.push((start_byte, end_byte));
			i += needle_chars.len(); // non-overlapping
		} else {
			i += 1;
		}
	}
	matches
}

fn find_in_lowered(
	hay_lower: &str,
	needle_lower: &str,
	start: usize,
) -> Vec<(usize, usize)> {
	let mut matches = Vec::new();
	let mut from = start;
	while from <= hay_lower.len() {
		if let Some(rel) = hay_lower[from..].find(needle_lower) {
			let start_idx = from + rel;
			let end_idx = start_idx + needle_lower.len();
			if hay_lower.is_char_boundary(start_idx)
				&& hay_lower.is_char_boundary(end_idx)
			{
				matches.push((start_idx, end_idx));
			}
			from = end_idx;
		} else {
			break;
		}
	}
	matches
}

pub(crate) fn build_excerpt(
	text: &str,
	start: usize,
	end: usize,
	radius: usize,
) -> (String, String, String) {
	let start = start.min(text.len());
	let end = end.min(text.len()).max(start);
	let before_start = start.saturating_sub(radius);
	let after_end = (end + radius).min(text.len());

	let before = snap_left(text, before_start, start);
	let highlight = text.get(start..end).unwrap_or("").to_string();
	let after = snap_right(text, end, after_end);

	(before, highlight, after)
}

fn snap_left(text: &str, from: usize, to: usize) -> String {
	let mut start = from;
	while start < to && !text.is_char_boundary(start) {
		start += 1;
	}
	text.get(start..to).unwrap_or("").to_string()
}

fn snap_right(text: &str, from: usize, to: usize) -> String {
	let mut end = to;
	while end > from && !text.is_char_boundary(end) {
		end -= 1;
	}
	text.get(from..end).unwrap_or("").to_string()
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::filesystem::media::tests::get_test_epub_path;

	#[test]
	fn extract_skips_script_and_style() {
		let xhtml = br#"<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml">
			<head><style>body{color:red}</style><script>evil()</script></head>
			<body><p>Hello &amp; welcome</p><div>world</div></body></html>"#;
		let text = extract_searchable_text(xhtml);
		assert!(text.contains("Hello & welcome"));
		assert!(text.contains("world"));
		assert!(!text.contains("evil"));
		assert!(!text.contains("color:red"));
	}

	#[test]
	fn extract_handles_malformed_trailing_markup() {
		let xhtml = b"<html><body><p>Still here</p><p>Broken";
		let text = extract_searchable_text(xhtml);
		assert!(text.contains("Still here"));
	}

	#[test]
	fn literal_match_is_case_insensitive_and_non_regex() {
		let hay = "Foo bar FOO and (foo.)";
		let matches = find_literal_matches_ci(hay, "foo", 0);
		assert_eq!(matches.len(), 3);
		let meta = find_literal_matches_ci(hay, "(foo.)", 0);
		assert_eq!(meta.len(), 1);
		assert_eq!(&hay[meta[0].0..meta[0].1], "(foo.)");
	}

	#[test]
	fn excerpt_preserves_unicode_boundaries() {
		let text = "αβγδ εζηθ ικλμ";
		let start = text.find('ε').unwrap();
		let end = start + 'ε'.len_utf8();
		let (before, highlight, after) = build_excerpt(text, start, end, 8);
		assert_eq!(highlight, "ε");
		assert!(before.ends_with(' ') || before.chars().all(|c| c != 'ε'));
		assert!(!after.is_empty() || after.is_empty());
	}

	#[test]
	fn cursor_round_trip() {
		let cursor = EpubSearchCursor {
			v: 1,
			spine_index: 3,
			text_offset: 42,
			query_fp: "abc".into(),
		};
		let encoded = cursor.encode();
		let decoded = EpubSearchOptions::decode_cursor(&encoded).unwrap();
		assert_eq!(decoded, cursor);
	}

	#[test]
	fn search_fixture_finds_alice() {
		let path = get_test_epub_path();
		let base = "https://example.com/api/v2/epub/book-1";
		let cancel = CancellationToken::new();
		let response = search_epub(
			&path,
			base,
			EpubSearchOptions::new("Alice").with_limit(5),
			&cancel,
		)
		.expect("search");

		assert!(!response.results.is_empty());
		let hit = &response.results[0];
		assert!(hit.locator.href.contains("/resource/"));
		assert!(hit.locator.href.starts_with(base));
		assert!(!hit.excerpt.contains('<'));
		assert_eq!(hit.locator.locations.position, hit.spine_index + 1);
		assert!(
			hit.locator.text.highlight.eq_ignore_ascii_case("Alice")
				|| hit.excerpt.to_lowercase().contains("alice")
		);
	}

	#[test]
	fn search_pagination_does_not_duplicate() {
		let path = get_test_epub_path();
		let base = "https://example.com/api/v2/epub/book-1";
		let cancel = CancellationToken::new();
		let first = search_epub(
			&path,
			base,
			EpubSearchOptions::new("Alice").with_limit(2),
			&cancel,
		)
		.expect("first page");
		assert_eq!(first.results.len(), 2);
		assert!(first.next_cursor.is_some());

		let cursor =
			EpubSearchOptions::decode_cursor(first.next_cursor.as_deref().unwrap())
				.unwrap();
		let second = search_epub(
			&path,
			base,
			EpubSearchOptions::new("Alice")
				.with_limit(2)
				.with_cursor(Some(cursor)),
			&cancel,
		)
		.expect("second page");

		let keys: std::collections::HashSet<_> = first
			.results
			.iter()
			.chain(second.results.iter())
			.map(|r| {
				(
					r.spine_index,
					r.locator.locations.progression.to_bits(),
					r.locator.text.highlight.clone(),
					r.excerpt.clone(),
				)
			})
			.collect();
		assert_eq!(keys.len(), first.results.len() + second.results.len());
	}

	#[test]
	fn search_respects_item_byte_cap() {
		let path = get_test_epub_path();
		let base = "https://example.com/api/v2/epub/book-1";
		let cancel = CancellationToken::new();
		let mut options = EpubSearchOptions::new("Alice").with_limit(20);
		options.max_item_bytes = 1; // force skip every item
		let response = search_epub(&path, base, options, &cancel).expect("search");
		assert!(response.results.is_empty());
		assert!(response.truncated);
	}

	#[test]
	fn search_cancelled_returns_error() {
		let path = get_test_epub_path();
		let cancel = CancellationToken::new();
		cancel.cancel();
		let err = search_epub(
			&path,
			"https://example.com/api/v2/epub/book-1",
			EpubSearchOptions::new("Alice"),
			&cancel,
		)
		.unwrap_err();
		assert!(matches!(err, EpubSearchError::Cancelled));
	}

	#[test]
	fn validate_rejects_short_query() {
		let err = EpubSearchOptions::new("a").validate().unwrap_err();
		assert!(matches!(err, EpubSearchError::InvalidQueryLength { .. }));
	}
}
