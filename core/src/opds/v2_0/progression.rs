use crate::CoreResult;

use super::{
	entity::OPDSProgressionEntity,
	link::{OPDSLinkFinalizer, OPDSLinkType},
	utils::default_now,
};
use derive_builder::Builder;
use rust_decimal::prelude::ToPrimitive;
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

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
