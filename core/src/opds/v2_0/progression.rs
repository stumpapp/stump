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
		let book_id = data.book.id;

		let device = match data.device {
			Some(device) => OPDSProgressionDevice {
				id: device.id,
				name: device.name,
			},
			_ => OPDSProgressionDevice::default(),
		};

		let extension = data.book.extension.to_lowercase();
		let percentage_completed =
			data.session.percentage_completed.and_then(|d| d.to_f64());
		let (title, href, _type, locations) =
			match (extension.as_str(), data.session.epubcfi, data.session.page) {
				("epub", Some(cfi), _) => {
					// TODO: Lookup chapter without opening file, e.g. epubcfi?
					let title = "Ebook Progress".to_string();
					// TODO: Use resource URL for href, e.g. OEBPS/chapter008.xhtml ?
					let locations =
						data.session.percentage_completed.map(|_progression| {
							vec![OPDSProgressionLocation {
								fragments: Some(vec![cfi]),
								total_progression: percentage_completed,
								..Default::default()
							}]
						});
					(Some(title), None, Some(OPDSLinkType::Xhtml), locations)
				},
				(_, None, Some(current_page)) => {
					let title = format!("Page {}", current_page);
					let href = link_finalizer.format_link(format!(
						"/opds/v2.0/books/{book_id}/pages/{current_page}",
					));
					let locations = vec![OPDSProgressionLocation {
						position: Some(current_page.to_string()),
						total_progression: percentage_completed.or_else(|| {
							Some(current_page as f64 / data.book.pages as f64)
						}),
						..Default::default()
					}];
					// TODO: Don't assume JPEG, use analysis to determine this
					let _type = OPDSLinkType::ImageJpeg;
					(Some(title), Some(href), Some(_type), Some(locations))
				},
				_ => (None, None, None, None),
			};

		OPDSProgressionBuilder::default()
			.device(device)
			.locator(
				OPDSProgressionLocatorBuilder::default()
					.title(title)
					.href(href)
					._type(_type)
					.locations(locations)
					.build()?,
			)
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
	locations: Option<Vec<OPDSProgressionLocation>>,
}

#[skip_serializing_none]
#[derive(Debug, Default, Clone, Serialize, Deserialize, Builder)]
#[builder(build_fn(error = "crate::CoreError"), default, setter(into))]
#[serde(rename_all = "camelCase")]
struct OPDSProgressionLocation {
	/// A list of fragments within the resource referenced by the [OPDSProgressionLocator] struct.
	fragments: Option<Vec<String>>,
	/// An index in the publication (1-based).
	position: Option<String>,
	/// Progression in the resource expressed as a percentage (0.0 to 1.0).
	progression: Option<f64>,
	/// Progression in the publication expressed as a percentage (0.0 to 1.0).
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
