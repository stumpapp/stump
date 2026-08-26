use std::path::Path;

use epub::doc::EpubDoc;
use models::shared::readium::{ReadiumLocation, ReadiumLocator};
use quick_xml::{events::Event, Reader};
use rust_decimal::prelude::ToPrimitive;
use serde::{Deserialize, Serialize};
use thiserror::Error;

const READIUM_POSITION_BYTES: u64 = 1024;

#[derive(Debug, Error)]
pub enum KoboPositionError {
	#[error("failed to open KEPUB: {0}")]
	Open(String),
	#[error("failed to parse KEPUB resource: {0}")]
	Parse(#[from] quick_xml::Error),
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
struct KoboSpanPosition {
	value: String,
	progression: f32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
struct KoboResourcePositions {
	source: String,
	readium_position_count: usize,
	spans: Vec<KoboSpanPosition>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ResolvedKoboPosition {
	pub source: String,
	pub value: String,
	/// Progression within `source`, normalized to 0..=1.
	pub progression: f32,
}

impl ResolvedKoboPosition {
	pub fn into_readium_locator(self, total_progression: f32) -> ReadiumLocator {
		ReadiumLocator {
			href: self.source,
			locations: Some(ReadiumLocation {
				progression: rust_decimal::Decimal::try_from(self.progression).ok(),
				total_progression: rust_decimal::Decimal::try_from(total_progression)
					.ok(),
				kobo_span: Some(self.value),
				..Default::default()
			}),
			..Default::default()
		}
	}
}

/// Sentence anchors from the exact KEPUB archive served to a Kobo device.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct KoboPositionMap {
	resources: Vec<KoboResourcePositions>,
}

impl KoboPositionMap {
	pub fn from_path(path: impl AsRef<Path>) -> Result<Self, KoboPositionError> {
		let path = path.as_ref().to_str().ok_or_else(|| {
			KoboPositionError::Open("path is not valid UTF-8".to_string())
		})?;
		let mut epub =
			EpubDoc::new(path).map_err(|err| KoboPositionError::Open(err.to_string()))?;
		let spine = epub.spine.clone();

		let mut resources = Vec::new();
		for item in spine.into_iter().filter(|item| item.linear) {
			let Some(resource) = epub.resources.get(&item.idref).cloned() else {
				continue;
			};
			let compressed_size = epub
				.get_resource_compressed_size(&item.idref)
				.unwrap_or_default();
			let Some((content, _)) = epub.get_resource(&item.idref) else {
				continue;
			};
			let source = resource.path.to_string_lossy().replace('\\', "/");
			let spans = parse_kobo_spans(&content)?;
			if spans.is_empty() {
				continue;
			}

			resources.push(KoboResourcePositions {
				source,
				// Match the synthetic-position calculation used by Stump's EPUB scanner.
				readium_position_count: readium_position_count(compressed_size),
				spans,
			});
		}

		Ok(Self { resources })
	}

	/// Resolves a Stump locator to an anchor which exists in the converted KEPUB.
	///
	/// Kobo-originated anchors round-trip exactly. Other readers do not know the generated spans,
	/// so their resource or total progression selects the nearest anchor in the served file.
	pub fn resolve(
		&self,
		locator: Option<&ReadiumLocator>,
		total_progression: Option<f32>,
	) -> Option<ResolvedKoboPosition> {
		if let Some(locator) = locator {
			if let Some(resource) = self.resource_for_href(&locator.href) {
				let locations = locator.locations.as_ref();
				if let Some(value) =
					locations.and_then(|locations| locations.kobo_span.as_ref())
				{
					if let Some(span) =
						resource.spans.iter().find(|span| &span.value == value)
					{
						return Some(ResolvedKoboPosition {
							source: resource.source.clone(),
							value: span.value.clone(),
							progression: locations
								.and_then(|locations| locations.progression)
								.and_then(|progression| progression.to_f32())
								.unwrap_or(span.progression)
								.clamp(0.0, 1.0),
						});
					}
				}

				if let Some(progression) = locations
					.and_then(|locations| locations.progression)
					.and_then(|progression| progression.to_f32())
				{
					return resource.resolve(progression);
				}
			}
		}

		let total_progression = locator
			.and_then(|locator| locator.locations.as_ref())
			.and_then(|locations| locations.total_progression)
			.and_then(|progression| progression.to_f32())
			.or(total_progression)?
			.clamp(0.0, 1.0);
		if total_progression == 1.0 {
			return self.last();
		}

		let total_positions: usize = self
			.resources
			.iter()
			.map(|resource| resource.readium_position_count)
			.sum();
		if total_positions == 0 {
			return None;
		}

		let target = ((total_progression * total_positions as f32).round() as usize)
			.clamp(1, total_positions)
			- 1;
		let mut offset = 0;
		for resource in &self.resources {
			let end = offset + resource.readium_position_count;
			if target < end {
				let local_position = target - offset;
				let progression =
					local_position as f32 / resource.readium_position_count as f32;
				return resource.resolve(progression);
			}
			offset = end;
		}

		self.last()
	}

	pub fn last(&self) -> Option<ResolvedKoboPosition> {
		let resource = self.resources.last()?;
		let span = resource.spans.last()?;
		Some(ResolvedKoboPosition {
			source: resource.source.clone(),
			value: span.value.clone(),
			progression: span.progression,
		})
	}

	fn resource_for_href(&self, href: &str) -> Option<&KoboResourcePositions> {
		let href = href
			.split(['#', '?'])
			.next()
			.unwrap_or(href)
			.trim_start_matches('/');
		let decoded = urlencoding::decode(href).ok();
		let href = decoded.as_deref().unwrap_or(href);

		self.resources
			.iter()
			.find(|resource| resource.source == href)
	}

	#[cfg(test)]
	fn from_resources(resources: impl IntoIterator<Item = (String, Vec<u8>)>) -> Self {
		Self {
			resources: resources
				.into_iter()
				.filter_map(|(source, content)| {
					let spans = parse_kobo_spans(&content).ok()?;
					(!spans.is_empty()).then(|| KoboResourcePositions {
						source,
						readium_position_count: readium_position_count(
							content.len() as u64
						),
						spans,
					})
				})
				.collect(),
		}
	}
}

fn readium_position_count(bytes: u64) -> usize {
	usize::try_from(bytes.max(1).div_ceil(READIUM_POSITION_BYTES)).unwrap_or(usize::MAX)
}

impl KoboResourcePositions {
	fn resolve(&self, progression: f32) -> Option<ResolvedKoboPosition> {
		let progression = progression.clamp(0.0, 1.0);
		let span = self.spans.iter().min_by(|left, right| {
			(left.progression - progression)
				.abs()
				.total_cmp(&(right.progression - progression).abs())
		})?;
		Some(ResolvedKoboPosition {
			source: self.source.clone(),
			value: span.value.clone(),
			progression,
		})
	}
}

fn parse_kobo_spans(content: &[u8]) -> Result<Vec<KoboSpanPosition>, quick_xml::Error> {
	let mut reader = Reader::from_reader(content);
	let mut buffer = Vec::new();
	let mut elements = Vec::new();
	let mut spans = Vec::new();

	loop {
		match reader.read_event_into(&mut buffer)? {
			Event::Start(element) => {
				let is_span = element.local_name().as_ref() == b"span";
				let mut id = None;
				let mut is_kobo_span = false;
				if is_span {
					for attribute in element.attributes().flatten() {
						match attribute.key.as_ref() {
							b"id" => {
								id = Some(
									String::from_utf8_lossy(attribute.value.as_ref())
										.into_owned(),
								)
							},
							b"class" => {
								is_kobo_span =
									String::from_utf8_lossy(attribute.value.as_ref())
										.split_ascii_whitespace()
										.any(|class| class == "koboSpan")
							},
							_ => {},
						}
					}
				}
				elements.push((is_kobo_span && id.is_some()).then_some(id).flatten());
			},
			Event::End(_) => {
				if let Some(Some(value)) = elements.pop() {
					spans.push(KoboSpanPosition {
						value,
						progression: (reader.buffer_position() as f32
							/ content.len().max(1) as f32)
							.clamp(0.0, 1.0),
					});
				}
			},
			Event::Eof => break,
			_ => {},
		}
		buffer.clear();
	}

	Ok(spans)
}

#[cfg(test)]
mod tests {
	use models::shared::readium::{ReadiumLocation, ReadiumLocator};
	use rust_decimal::Decimal;

	use super::KoboPositionMap;

	fn position_map() -> KoboPositionMap {
		let first = format!(
			"<html><body><span class=\"koboSpan\" id=\"kobo.1.1\">first</span>{}<span class=\"koboSpan\" id=\"kobo.1.2\">last</span></body></html>",
			"x".repeat(1100)
		);
		let second =
			"<html><body><span class=\"koboSpan\" id=\"kobo.1.1\">second</span></body></html>";

		KoboPositionMap::from_resources([
			("OPS/first.xhtml".to_string(), first.into_bytes()),
			("OPS/second.xhtml".to_string(), second.as_bytes().to_vec()),
		])
	}

	#[test]
	fn preserves_an_existing_kobo_span() {
		let map = position_map();
		let locator = ReadiumLocator {
			href: "OPS/first.xhtml".to_string(),
			locations: Some(ReadiumLocation {
				progression: Some(Decimal::new(9, 1)),
				kobo_span: Some("kobo.1.1".to_string()),
				..Default::default()
			}),
			..Default::default()
		};

		let resolved = map.resolve(Some(&locator), Some(0.9)).unwrap();
		assert_eq!(resolved.source, "OPS/first.xhtml");
		assert_eq!(resolved.value, "kobo.1.1");
		assert_eq!(resolved.progression, 0.9);
	}

	#[test]
	fn chooses_nearest_span_from_resource_progression() {
		let map = position_map();
		let locator = ReadiumLocator {
			href: "OPS/first.xhtml".to_string(),
			locations: Some(ReadiumLocation {
				progression: Some(Decimal::new(9, 1)),
				..Default::default()
			}),
			..Default::default()
		};

		let resolved = map.resolve(Some(&locator), None).unwrap();
		assert_eq!(resolved.value, "kobo.1.2");
		assert_eq!(resolved.progression, 0.9);
	}

	#[test]
	fn falls_back_to_total_progression_and_last_position() {
		let map = position_map();

		let resolved = map.resolve(None, Some(1.0)).unwrap();
		assert_eq!(resolved.source, "OPS/second.xhtml");
		assert_eq!(resolved.value, "kobo.1.1");
		assert_eq!(resolved, map.last().unwrap());
	}

	#[test]
	fn round_trips_cached_position_maps() {
		let map = position_map();
		let cached = serde_json::to_vec(&map).unwrap();

		assert_eq!(
			serde_json::from_slice::<KoboPositionMap>(&cached).unwrap(),
			map
		);
	}
}
