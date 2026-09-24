use crate::CoreResult;

use super::{entity::OPDSProgressionEntity, utils::default_now};
use chrono::{DateTime, FixedOffset};
use derive_builder::Builder;
use models::shared::readium::{ReadiumLocation, ReadiumLocator};
use rust_decimal::{prelude::ToPrimitive, Decimal};
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

pub const OPDS_PROGRESSION_MEDIA_TYPE: &str = "application/opds-progression+json";
pub const OPDS_PROGRESSION_REL: &str = "http://opds-spec.org/progression";

/// The output type for OPDS Progression 1.0
/// See: https://drafts.opds.io/opds-progression-1.0.html
#[skip_serializing_none]
#[derive(Debug, Default, Clone, Builder, Serialize, Deserialize)]
#[builder(build_fn(error = "crate::CoreError"), default, setter(into))]
pub struct OPDSProgression {
	#[builder(default = "default_now()")]
	modified: String,
	#[builder(default)]
	device: OPDSProgressionDevice,
	title: Option<String>,
	/// Total progression in the publication expressed as a percentage (0.0 to 1.0)
	progression: f64,
	/// A list of references inside the publication which orient to the current position.
	///
	/// Rant: The spec is really loose and it makes it hard for a client to cover
	/// all the bases. For Stump, the server will always send:
	/// - #page=N for paged media
	/// - href with optional fragment for EPUBs
	///
	/// See https://drafts.opds.io/opds-progression-1.0.html#references
	references: Option<Vec<String>>,
}

impl OPDSProgression {
	pub fn new(data: OPDSProgressionEntity) -> CoreResult<Self> {
		let device = match data.device.as_ref() {
			Some(device) => OPDSProgressionDevice {
				id: device.id.clone(),
				name: device.name.clone(),
			},
			_ => OPDSProgressionDevice::default(),
		};

		let percentage_completed = data.session.end_percentage.and_then(|d| d.to_f64());

		let (title, progression, references) =
			if data.book.extension.eq_ignore_ascii_case("epub") {
				OPDSProgressionFields::epub(
					data.session.end_locator.as_ref(),
					percentage_completed,
				)
			} else {
				OPDSProgressionFields::paged(&data, percentage_completed)
			};

		OPDSProgressionBuilder::default()
			.device(device)
			.modified(
				data.session
					.updated_at
					.map(|dt| dt.to_rfc3339())
					.unwrap_or_else(default_now),
			)
			.title(title)
			.progression(progression.unwrap_or(0.0))
			.references(references)
			.build()
	}

	/// Returns the modified date as a `DateTime<FixedOffset>`
	pub fn modified_at(&self) -> Result<DateTime<FixedOffset>, chrono::ParseError> {
		DateTime::parse_from_rfc3339(&self.modified)
	}

	/// Returns device info if it exists
	pub fn device(&self) -> Option<&OPDSProgressionDevice> {
		if self.device.id.is_empty() && self.device.name.is_empty() {
			None
		} else {
			Some(&self.device)
		}
	}

	/// Tries to extract a page number from `references`
	pub fn page(&self) -> Option<i32> {
		self.references
			.as_ref()?
			.iter()
			.find_map(|r| r.strip_prefix("#page=").and_then(|n| n.parse::<i32>().ok()))
	}

	pub fn percentage_completed(&self) -> Option<Decimal> {
		Decimal::try_from(self.progression).ok()
	}

	/// Converts this document into a [`ReadiumLocator`], if there is at least
	/// one reference to use as the `href`
	pub fn locator(&self) -> Option<ReadiumLocator> {
		let href = self
			.references
			.as_ref()
			.and_then(|r| r.first())
			.cloned()
			.unwrap_or_default();

		Some(ReadiumLocator {
			href,
			title: self.title.clone(),
			r#type: String::new(),
			chapter_title: String::new(),
			locations: Some(ReadiumLocation {
				total_progression: Decimal::try_from(self.progression).ok(),
				position: self.page(),
				// The v1 spec doesn't carry sub-resource fragments or CSS selectors separately.
				..Default::default()
			}),
			text: None,
		})
	}
}

struct OPDSProgressionFields;

impl OPDSProgressionFields {
	fn epub(
		locator: Option<&ReadiumLocator>,
		percentage_completed: Option<f64>,
	) -> (Option<String>, Option<f64>, Option<Vec<String>>) {
		let Some(locator) = locator else {
			return (None, percentage_completed, None);
		};

		let title = if locator.chapter_title.is_empty() {
			locator.title.clone()
		} else {
			Some(locator.chapter_title.clone())
		};

		let progression = locator
			.locations
			.as_ref()
			.and_then(|l| l.total_progression.and_then(|p| p.to_f64()))
			.or(percentage_completed);

		let reference = if locator.href.is_empty() {
			None
		} else {
			let fragment = locator
				.locations
				.as_ref()
				.and_then(|l| l.fragments.as_ref())
				.and_then(|f| f.first())
				.map(|f| {
					if f.starts_with('#') {
						f.clone()
					} else {
						format!("#{f}")
					}
				});

			Some(match fragment {
				Some(frag) => format!("{}{}", locator.href, frag),
				None => locator.href.clone(),
			})
		};

		(title, progression, reference.map(|r| vec![r]))
	}

	fn paged(
		data: &OPDSProgressionEntity,
		percentage_completed: Option<f64>,
	) -> (Option<String>, Option<f64>, Option<Vec<String>>) {
		let Some(current_page) = data.session.end_page else {
			return (None, percentage_completed, None);
		};

		let progression = percentage_completed.unwrap_or_else(|| {
			if data.book.pages > 0 {
				current_page as f64 / data.book.pages as f64
			} else {
				0.0
			}
		});

		(
			Some(format!("Page {current_page}")),
			Some(progression),
			Some(vec![format!("#page={current_page}")]),
		)
	}
}

/// The device that the progression was recorded on
/// See https://drafts.opds.io/opds-progression-1.0.html#device-object
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct OPDSProgressionDevice {
	pub id: String,
	pub name: String,
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_progression_input_deserializes_from_json() {
		let json = r##"{
			"modified": "2026-01-28T08:17:11.986000-07:00",
			"device": { "id": "device-123", "name": "Stump App - iOS" },
			"progression": 0.25,
			"references": ["#page=5"]
		}"##;

		let input: OPDSProgression = serde_json::from_str(json).unwrap();
		assert_eq!(input.page(), Some(5));
		assert_eq!(input.device().unwrap().id, "device-123");
		assert!((input.progression - 0.25).abs() < f64::EPSILON);
	}

	#[test]
	fn test_empty_device_returns_none() {
		let json = r#"{
			"modified": "2026-01-28T08:17:11.986000-07:00",
			"device": { "id": "", "name": "" },
			"progression": 0.0
		}"#;

		let input: OPDSProgression = serde_json::from_str(json).unwrap();
		assert!(input.device().is_none());
	}

	#[test]
	fn test_page_from_pdf_reference() {
		let json = r##"{
			"modified": "2026-01-28T08:17:11.986000-07:00",
			"device": { "id": "d", "name": "n" },
			"progression": 0.5,
			"references": ["#page=10"]
		}"##;

		let input: OPDSProgression = serde_json::from_str(json).unwrap();
		assert_eq!(input.page(), Some(10));
	}

	#[test]
	fn test_page_none_when_no_references() {
		let json = r#"{
			"modified": "2026-01-28T08:17:11.986000-07:00",
			"device": { "id": "d", "name": "n" },
			"progression": 0.5
		}"#;

		let input: OPDSProgression = serde_json::from_str(json).unwrap();
		assert_eq!(input.page(), None);
	}
}
