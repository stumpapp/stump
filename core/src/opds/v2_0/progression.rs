use crate::CoreResult;

use super::{
	entity::OPDSProgressionEntity,
	link::{OPDSLinkFinalizer, OPDSLinkType},
	utils::default_now,
};
use derive_builder::Builder;
use models::shared::readium::{ReadiumLocation, ReadiumLocator, ReadiumText};
use rust_decimal::{prelude::ToPrimitive, Decimal};
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

pub const OPDS_PROGRESSION_MEDIA_TYPE: &str = "application/vnd.readium.progression+json";
pub const CANTOOK_PROGRESSION_REL: &str = "http://www.cantook.com/api/progression";

#[derive(Debug, Default, Clone, Builder, Serialize, Deserialize)]
#[builder(build_fn(error = "crate::CoreError"), default, setter(into))]
#[serde(rename_all = "camelCase")]
pub struct OPDSProgression {
	#[builder(default = "default_now()")]
	modified: String,
	#[builder(default)]
	device: OPDSProgressionDevice,
	#[builder(default)]
	locator: OPDSProgressionLocator,
}

impl OPDSProgression {
	pub fn new(
		data: OPDSProgressionEntity,
		link_finalizer: OPDSLinkFinalizer,
	) -> CoreResult<Self> {
		let device = match data.device.as_ref() {
			Some(device) => OPDSProgressionDevice {
				id: device.id.clone(),
				name: device.name.clone(),
			},
			_ => OPDSProgressionDevice::default(),
		};

		OPDSProgressionBuilder::default()
			.device(device)
			.locator(OPDSProgressionLocator::new(&data, &link_finalizer)?)
			.modified(
				data.session
					.updated_at
					.map(|dt| dt.to_rfc3339())
					.unwrap_or_else(default_now),
			)
			.build()
	}
}

// https://readium.org/architecture/schema/locator.schema.json
#[skip_serializing_none]
#[derive(Debug, Default, Clone, Serialize, Deserialize, Builder)]
#[builder(build_fn(error = "crate::CoreError"), default, setter(into))]
struct OPDSProgressionLocator {
	title: Option<String>,
	href: Option<String>,
	#[serde(rename = "type")]
	_type: Option<OPDSLinkType>,
	#[builder(default)]
	locations: Option<OPDSProgressionLocation>,
}

impl OPDSProgressionLocator {
	fn new(
		data: &OPDSProgressionEntity,
		link_finalizer: &OPDSLinkFinalizer,
	) -> CoreResult<Self> {
		let percentage_completed = data.session.end_percentage.and_then(|d| d.to_f64());

		if data.book.extension.eq_ignore_ascii_case("epub") {
			return Self::epub(data.session.end_locator.as_ref(), percentage_completed);
		}

		Self::paged(data, link_finalizer, percentage_completed)
	}

	fn epub(
		locator: Option<&ReadiumLocator>,
		percentage_completed: Option<f64>,
	) -> CoreResult<Self> {
		let Some(locator) = locator else {
			return OPDSProgressionLocatorBuilder::default().build();
		};

		let title = if locator.chapter_title.is_empty() {
			locator.title.clone()
		} else {
			Some(locator.chapter_title.clone())
		}
		.unwrap_or_else(|| "Ebook Progress".to_string());
		let locations =
			locator
				.locations
				.as_ref()
				.map(|locations| OPDSProgressionLocation {
					fragments: locations.fragments.clone(),
					position: locations.position,
					progression: locations.progression.and_then(|p| p.to_f64()),
					total_progression: locations
						.total_progression
						.and_then(|p| p.to_f64())
						.or(percentage_completed),
				});

		OPDSProgressionLocatorBuilder::default()
			.title(Some(title))
			.href(Some(locator.href.clone()))
			._type(Some(OPDSLinkType::Xhtml))
			.locations(locations)
			.build()
	}

	fn paged(
		data: &OPDSProgressionEntity,
		link_finalizer: &OPDSLinkFinalizer,
		percentage_completed: Option<f64>,
	) -> CoreResult<Self> {
		let Some(current_page) = data.session.end_page else {
			return OPDSProgressionLocatorBuilder::default().build();
		};
		let href = link_finalizer.format_link(format!(
			"/opds/v2.0/books/{}/pages/{current_page}",
			data.book.id
		));
		let locations = OPDSProgressionLocation {
			position: Some(current_page),
			total_progression: percentage_completed
				.or_else(|| Some(current_page as f64 / data.book.pages as f64)),
			..Default::default()
		};

		OPDSProgressionLocatorBuilder::default()
			.title(Some(format!("Page {current_page}")))
			.href(Some(href))
			// TODO: Don't assume JPEG; use analysis to determine this.
			._type(Some(OPDSLinkType::ImageJpeg))
			.locations(Some(locations))
			.build()
	}
}

#[skip_serializing_none]
#[derive(Debug, Default, Clone, Serialize, Deserialize, Builder)]
#[builder(build_fn(error = "crate::CoreError"), default, setter(into))]
#[serde(rename_all = "camelCase")]
struct OPDSProgressionLocation {
	/// A list of fragments within the resource referenced by the [OPDSProgressionLocator] struct.
	fragments: Option<Vec<String>>,
	/// An index in the publication (1-based).
	position: Option<i32>,
	/// Progression in the resource expressed as a percentage (0.0 to 1.0). This is
	/// progression within the current resource, not the entire publication.
	///
	/// A few clarifying notes:
	/// If the publication is a single resource, e.g., comics, manga, etc, this is equivalent to total_progression
	/// If the publication has multiple resources, e.g., EPUB, this is progression within the current resource only
	progression: Option<f64>,
	/// Progression in the publication expressed as a percentage (0.0 to 1.0). This is
	/// progression within the entire publication.
	total_progression: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct OPDSProgressionDevice {
	id: String,
	name: String,
}

/// The input type for updating book progression via OPDS v2
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OPDSProgressionInput {
	pub modified: chrono::DateTime<chrono::FixedOffset>,
	pub device: OPDSProgressionDeviceInput,
	pub locator: OPDSProgressionLocatorInput,
}

/// Device information for progression input
#[derive(Debug, Clone, Deserialize)]
pub struct OPDSProgressionDeviceInput {
	pub id: String,
	pub name: String,
}

/// Locator input following Readium Locator schema
/// See: https://readium.org/architecture/schema/locator.schema.json
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OPDSProgressionLocatorInput {
	/// URI of the resource in the publication (required per spec)
	pub href: String,
	/// MIME type of the resource (required per spec)
	#[serde(rename = "type")]
	pub media_type: String,
	/// Title of the chapter/section
	pub title: Option<String>,
	/// Location within the resource
	pub locations: Option<OPDSProgressionLocationInput>,
	/// Text context around the position
	pub text: Option<OPDSProgressionTextInput>,
}

/// Location information within a resource
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OPDSProgressionLocationInput {
	pub fragments: Option<Vec<String>>,
	pub position: Option<i32>, // 1-based
	pub progression: Option<f64>,
	pub total_progression: Option<f64>, // 0.0 to 1.0
}

/// Text context around the reading position
#[derive(Debug, Clone, Deserialize)]
pub struct OPDSProgressionTextInput {
	pub before: Option<String>,
	pub highlight: Option<String>,
	pub after: Option<String>,
}

impl OPDSProgressionInput {
	pub fn device(&self) -> Option<OPDSProgressionDeviceInput> {
		if self.device.id.is_empty() && self.device.name.is_empty() {
			None
		} else {
			Some(self.device.clone())
		}
	}

	pub fn page(&self) -> Option<i32> {
		self.locator.locations.as_ref().and_then(|l| l.position)
	}

	pub fn percentage_completed(&self) -> Option<Decimal> {
		self.locator
			.locations
			.as_ref()
			.and_then(|l| l.total_progression)
			.and_then(|p| Decimal::try_from(p).ok())
	}

	pub fn locator(&self) -> Option<ReadiumLocator> {
		let locations = self.locator.locations.as_ref().map(|l| ReadiumLocation {
			fragments: l.fragments.clone(),
			progression: l.progression.and_then(|p| Decimal::try_from(p).ok()),
			position: l.position,
			total_progression: l
				.total_progression
				.and_then(|p| Decimal::try_from(p).ok()),
			// TODO(opds): Do we need these for progression?
			css_selector: None,
			partial_cfi: None,
		});

		let text = self.locator.text.as_ref().map(|t| ReadiumText {
			before: t.before.clone(),
			highlight: t.highlight.clone(),
			after: t.after.clone(),
		});

		Some(ReadiumLocator {
			href: self.locator.href.clone(),
			title: self.locator.title.clone(),
			r#type: self.locator.media_type.clone(),
			chapter_title: String::new(),
			locations,
			text,
		})
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_progression_input_deserializes_from_json() {
		let json = r#"{
        "modified": "2026-01-28T08:17:11.986000-07:00",
        "device": { "id": "device-123", "name": "Stump App - iOS" },
        "locator": {
            "href": "/opds/v2.0/books/1/pages/5",
            "type": "image/jpeg",
            "locations": {
                "position": 5,
                "progression": 0.25,
                "totalProgression": 0.25
            }
        }
    }"#;

		let input: OPDSProgressionInput = serde_json::from_str(json).unwrap();
		assert_eq!(input.page(), Some(5));
		assert_eq!(input.device().unwrap().id, "device-123");
	}

	#[test]
	fn test_empty_device_returns_none() {
		let json = r#"{
        "modified": "2026-01-28T08:17:11.986000-07:00",
        "device": { "id": "", "name": "" },
        "locator": { "href": "/opds/v2.0/books/1/pages/5", "type": "image/jpeg" }
	}"#;

		let input: OPDSProgressionInput = serde_json::from_str(json).unwrap();
		assert!(input.device().is_none());
	}
}
