//! A module for representing links in an OPDS 2.0 feed, as defined by the OPDS 2.0 spec at
//! https://drafts.opds.io/opds-2.0

use derive_builder::Builder;
use models::entity::{library, series};
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

use crate::filesystem::ContentType;

use super::{
	properties::{OPDSProperties, AUTH_ROUTE},
	utils::ArrayOrItem,
};

/// The relationship between a link and the resource it points to, as defined by the OPDS 2.0 spec.
///
/// This struct was derived from multiple sources within the OPDS 2.0 spec, including:
/// - https://drafts.opds.io/opds-2.0#21-navigation
/// - https://drafts.opds.io/opds-2.0#4-pagination
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum OPDSLinkRel {
	#[serde(rename = "self")]
	SelfLink,
	Start,
	Subsection,
	Current,
	Search,
	Next,
	Previous,
	First,
	Last,
	Help,
	Logo,
	#[serde(rename = "http://opds-spec.org/acquisition")]
	Acquisition,
	#[serde(rename = "http://www.cantook.com/api/progression")]
	Progression,
}

impl OPDSLinkRel {
	pub fn item(self) -> ArrayOrItem<OPDSLinkRel> {
		ArrayOrItem::Item(self)
	}

	pub fn array(rels: Vec<OPDSLinkRel>) -> ArrayOrItem<OPDSLinkRel> {
		ArrayOrItem::Array(rels)
	}
}

impl ArrayOrItem<OPDSLinkRel> {
	pub fn contains(&self, rel: &OPDSLinkRel) -> bool {
		match self {
			ArrayOrItem::Item(item) => item == rel,
			ArrayOrItem::Array(arr) => arr.contains(rel),
		}
	}
}

/// The type of the linked resource, which generally follows the MIME type format.
///
/// This struct was derived from multiple sources within the OPDS 2.0 spec, including:
/// - https://drafts.opds.io/opds-2.0.html#23-images
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum OPDSLinkType {
	#[serde(rename = "application/divina+json")]
	DivinaJson,
	#[serde(rename = "application/opds+json")]
	OpdsJson,
	#[serde(rename = "http://opds-spec.org/auth/document")]
	OpdsAuthDocument,
	#[serde(rename = "application/opds-authentication+json")]
	OpdsAuthJson,
	#[serde(rename = "application/opds-publication+json")]
	OpdsPublication,
	#[serde(rename = "image/jpeg")]
	ImageJpeg,
	#[serde(rename = "image/png")]
	ImagePng,
	#[serde(rename = "image/gif")]
	ImageGif,
	#[serde(rename = "image/avif")]
	ImageAvif,
	#[serde(rename = "application/vnd.comicbook-rar")]
	Cbr,
	#[serde(rename = "application/vnd.comicbook+zip")]
	Cbz,
	#[serde(rename = "application/vnd.rar")]
	Rar,
	#[serde(rename = "application/zip")]
	Zip,
	#[serde(rename = "application/pdf")]
	Pdf,
	#[serde(rename = "application/epub+zip")]
	Epub,
	#[serde(rename = "application/vnd.readium.progression+json")]
	Progression,
	#[serde(rename = "application/xhtml+xml")]
	Xhtml,
	#[serde(untagged)]
	Custom(String),
}

impl From<ContentType> for OPDSLinkType {
	fn from(content_type: ContentType) -> Self {
		match content_type {
			ContentType::COMIC_RAR => OPDSLinkType::Cbr,
			ContentType::COMIC_ZIP => OPDSLinkType::Cbz,
			ContentType::RAR => OPDSLinkType::Rar,
			ContentType::ZIP => OPDSLinkType::Zip,
			ContentType::PDF => OPDSLinkType::Pdf,
			ContentType::EPUB_ZIP => OPDSLinkType::Epub,
			ContentType::JPEG => OPDSLinkType::ImageJpeg,
			ContentType::PNG => OPDSLinkType::ImagePng,
			ContentType::GIF => OPDSLinkType::ImageGif,
			ContentType::AVIF => OPDSLinkType::ImageAvif,
			ContentType::XHTML => OPDSLinkType::Xhtml,
			_ => OPDSLinkType::Custom(content_type.mime_type().to_string()),
		}
	}
}

/// A struct for representing the common elements of an OPDS link. Other link types can be derived from this struct,
/// such as [OPDSImageLink] and [OPDSNavigationLink], and flattened for serialization into a unified JSON object.
#[skip_serializing_none]
#[derive(Debug, Default, Clone, Builder, Serialize, Deserialize)]
#[builder(build_fn(error = "crate::CoreError"), default, setter(into))]
pub struct OPDSBaseLink {
	/// The title of the linked resource, if available
	pub title: Option<String>,
	/// The relationship between the link and the resource it points to.
	/// This can be a single value or an array of values.
	///
	/// An example of a multi-valued link rel might be: ["first", "previous"] or ["next", "last"].
	pub rel: Option<ArrayOrItem<OPDSLinkRel>>,
	/// The URI of the linked resource
	pub href: String,
	/// The type of the linked resource, which generally follows the MIME type format
	#[serde(rename = "type", skip_serializing_if = "Option::is_none")]
	pub _type: Option<OPDSLinkType>,
	// TODO: confirm what this means, I couldn't find it referenced much in the spec
	/// Whether the link is a templated link, i.e. a URI that can be expanded.
	/// This is useful for search links, for example.
	///
	/// Example: `https://example.com/search{?query}`
	pub templated: Option<bool>,
	// pub children: Option<Vec<Link>>,
	pub properties: Option<OPDSProperties>,
}

impl OPDSBaseLink {
	pub fn with_auth(self, service_url: String) -> Self {
		if let Some(properties) = self.properties {
			Self {
				properties: Some(properties.with_auth(service_url)),
				..self
			}
		} else {
			Self {
				properties: Some(OPDSProperties::default().with_auth(service_url)),
				..self
			}
		}
	}

	pub fn as_link(self) -> OPDSLink {
		OPDSLink::Link(self)
	}
}

/// A struct for representing an image link, which is a special type of link that points to an image resource.
///
/// See https://drafts.opds.io/opds-2.0.html#23-images
#[skip_serializing_none]
#[derive(Debug, Clone, Default, Builder, Serialize, Deserialize)]
#[builder(build_fn(error = "crate::CoreError"), default, setter(into))]
pub struct OPDSImageLink {
	/// The height of the image in pixels
	height: Option<u32>,
	/// The width of the image in pixels
	width: Option<u32>,
	#[serde(flatten)]
	base_link: OPDSBaseLink,
}

/// A struct for representing a navigation link, which is a special type of link that an end user can follow in order to
/// browse a catalog. It must be a compact collection and contain a title.
#[derive(Debug, Builder, Clone, Serialize, Deserialize)]
#[builder(build_fn(error = "crate::CoreError"), setter(into))]
pub struct OPDSNavigationLink {
	pub title: String,
	#[serde(flatten)]
	pub base_link: OPDSBaseLink,
}

impl OPDSNavigationLink {
	pub fn rel(self, rel: OPDSLinkRel) -> Self {
		Self {
			base_link: OPDSBaseLink {
				rel: Some(rel.item()),
				..self.base_link
			},
			..self
		}
	}

	pub fn finalize(self, finalizer: &OPDSLinkFinalizer) -> Self {
		Self {
			base_link: finalizer.finalize_base_link(self.base_link),
			..self
		}
	}
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum OPDSLink {
	Link(OPDSBaseLink),
	Navigation(OPDSNavigationLink),
	Image(OPDSImageLink),
}

impl OPDSLink {
	pub fn help() -> Self {
		Self::Link(OPDSBaseLink {
			href: String::from("https://stumpapp.dev"),
			rel: Some(OPDSLinkRel::Help.item()),
			..Default::default()
		})
	}

	pub fn logo(href: String) -> Self {
		Self::Link(OPDSBaseLink {
			href,
			rel: Some(OPDSLinkRel::Logo.item()),
			..Default::default()
		})
	}

	pub fn progression(book_id: String, finalizer: &OPDSLinkFinalizer) -> Self {
		Self::Link(OPDSBaseLink {
			href: finalizer
				.format_link(format!("/opds/v2.0/books/{book_id}/progression",)),
			rel: Some(OPDSLinkRel::Progression.item()),
			_type: Some(OPDSLinkType::Progression),
			properties: Some(
				OPDSProperties::default().with_auth(finalizer.format_link(AUTH_ROUTE)),
			),
			..Default::default()
		})
	}
}

#[derive(Debug, Clone)]
pub struct OPDSLinkFinalizer {
	service_url: String,
}

impl OPDSLinkFinalizer {
	pub fn new(service_url: String) -> Self {
		Self { service_url }
	}

	pub fn format_link<A: AsRef<str>>(&self, url: A) -> String {
		let url = url.as_ref();
		if url.starts_with('/') {
			format!("{}{}", self.service_url, url)
		} else if url.starts_with("http") {
			url.to_string()
		} else {
			format!("{}/{}", self.service_url, url)
		}
	}

	fn finalize_base_link(&self, mut base_link: OPDSBaseLink) -> OPDSBaseLink {
		base_link.href = self.format_link(&base_link.href);
		if let Some(mut properties) = base_link.properties {
			if let Some(mut authenticate) = properties.authenticate {
				authenticate.href = self.format_link(&authenticate.href);
				properties.authenticate = Some(authenticate);
			}
			base_link.properties = Some(properties);
		}
		base_link
	}

	pub fn finalize(&self, link: OPDSLink) -> OPDSLink {
		match link {
			OPDSLink::Link(base_link) => {
				OPDSLink::Link(self.finalize_base_link(base_link))
			},
			OPDSLink::Navigation(mut navigation_link) => {
				navigation_link.base_link =
					self.finalize_base_link(navigation_link.base_link);
				OPDSLink::Navigation(navigation_link)
			},
			OPDSLink::Image(mut image_link) => {
				image_link.base_link = self.finalize_base_link(image_link.base_link);
				OPDSLink::Image(image_link)
			},
		}
	}

	pub fn finalize_all(&self, links: Vec<OPDSLink>) -> Vec<OPDSLink> {
		links.into_iter().map(|link| self.finalize(link)).collect()
	}
}

// TODO(OPDS-V2): What should rel be?
impl From<library::Model> for OPDSNavigationLink {
	fn from(library: library::Model) -> Self {
		OPDSNavigationLink {
			title: library.name,
			base_link: OPDSBaseLink {
				href: format!("/opds/v2.0/libraries/{}", library.id),
				_type: Some(OPDSLinkType::OpdsJson),
				rel: Some(OPDSLinkRel::Subsection.item()),
				..Default::default()
			},
		}
	}
}

// TODO(OPDS-V2): What should rel be?
impl From<series::Model> for OPDSNavigationLink {
	fn from(series: series::Model) -> Self {
		OPDSNavigationLink {
			title: series.name,
			base_link: OPDSBaseLink {
				href: format!("/opds/v2.0/series/{}", series.id),
				_type: Some(OPDSLinkType::OpdsJson),
				rel: Some(OPDSLinkRel::Subsection.item()),
				..Default::default()
			},
		}
	}
}

#[cfg(test)]
mod tests {
	use models::shared::enums::FileStatus;

	use crate::opds::v2_0::properties::{OPDSDynamicProperties, OPDSPropertiesBuilder};

	use super::*;

	#[test]
	fn test_image_link_serialization() {
		let image_link = OPDSImageLink {
			height: Some(100),
			width: Some(200),
			base_link: OPDSBaseLink {
				title: Some("An image".to_string()),
				rel: Some(OPDSLinkRel::Logo.item()),
				href: "https://example.com/image.jpg".to_string(),
				_type: Some(OPDSLinkType::ImageJpeg),
				templated: None,
				properties: None,
			},
		};

		let json = serde_json::to_string(&image_link).unwrap();
		assert_eq!(
			json,
			r#"{"height":100,"width":200,"title":"An image","rel":"logo","href":"https://example.com/image.jpg","type":"image/jpeg"}"#
		);
	}

	#[test]
	fn test_navigation_link_serialization() {
		let navigation_link = OPDSNavigationLink {
			title: "A library".to_string(),
			base_link: OPDSBaseLink {
				title: None,
				rel: Some(OPDSLinkRel::Start.item()),
				href: "https://example.com/library".to_string(),
				_type: Some(OPDSLinkType::OpdsJson),
				templated: None,
				properties: None,
			},
		};

		let json = serde_json::to_string(&navigation_link).unwrap();
		assert_eq!(
			json,
			r#"{"title":"A library","rel":"start","href":"https://example.com/library","type":"application/opds+json"}"#
		);
	}

	#[test]
	fn test_link_serialization() {
		let link = OPDSLink::Link(OPDSBaseLink {
			title: Some("A link".to_string()),
			rel: Some(OPDSLinkRel::SelfLink.item()),
			href: "https://example.com/link".to_string(),
			_type: Some(OPDSLinkType::Custom("application/custom".to_string())),
			templated: Some(true),
			properties: None,
		});

		let json = serde_json::to_string(&link).unwrap();
		assert_eq!(
			json,
			r#"{"title":"A link","rel":"self","href":"https://example.com/link","type":"application/custom","templated":true}"#
		);
	}

	#[test]
	fn test_link_with_properties_serialization() {
		let link = OPDSLink::Link(OPDSBaseLink {
			title: Some("A link".to_string()),
			rel: Some(OPDSLinkRel::SelfLink.item()),
			href: "https://example.com/search{?query}".to_string(),
			_type: Some(OPDSLinkType::Custom("application/custom".to_string())),
			templated: Some(true),
			properties: Some(
				OPDSPropertiesBuilder::default()
					.dynamic_properties(OPDSDynamicProperties(serde_json::json!({
						"custom": "property"
					})))
					.build()
					.unwrap(),
			),
		});

		let json = serde_json::to_string(&link).unwrap();
		assert_eq!(
			json,
			r#"{"title":"A link","rel":"self","href":"https://example.com/search{?query}","type":"application/custom","templated":true,"properties":{"custom":"property"}}"#
		);
	}

	#[test]
	fn test_help_link_serialization() {
		let link = OPDSLink::help();

		let json = serde_json::to_string(&link).unwrap();
		assert_eq!(json, r#"{"rel":"help","href":"https://stumpapp.dev"}"#);
	}

	#[test]
	fn test_logo_link_serialization() {
		let link = OPDSLink::logo("https://example.com/logo.png".to_string());

		let json = serde_json::to_string(&link).unwrap();
		assert_eq!(
			json,
			r#"{"rel":"logo","href":"https://example.com/logo.png"}"#
		);
	}

	#[test]
	fn test_navigation_link_from_library_data() {
		let library = library::Model {
			id: "123".to_string(),
			name: "A library".to_string(),
			created_at: chrono::Utc::now().into(),
			updated_at: Some(chrono::Utc::now().into()),
			description: None,
			emoji: None,
			last_scanned_at: None,
			config_id: 1,
			path: String::default(),
			status: FileStatus::Ready,
		};

		let link: OPDSNavigationLink = library.into();

		let json = serde_json::to_string(&link).unwrap();
		assert_eq!(
			json,
			r#"{"title":"A library","rel":"subsection","href":"/opds/v2.0/libraries/123","type":"application/opds+json"}"#,
		);
	}

	#[test]
	fn test_finalizer_format_link() {
		let finalizer = OPDSLinkFinalizer::new("https://example.com".to_string());

		assert_eq!(
			finalizer.format_link("/opds/v2.0/libraries"),
			"https://example.com/opds/v2.0/libraries"
		);
		assert_eq!(
			finalizer.format_link("https://example.com/opds/v2.0/libraries"),
			"https://example.com/opds/v2.0/libraries"
		);
	}

	#[test]
	fn test_finalizer_finalize_base_link() {
		let finalizer = OPDSLinkFinalizer::new("https://example.com".to_string());

		let base_link = OPDSBaseLink {
			title: Some("A link".to_string()),
			rel: Some(OPDSLinkRel::SelfLink.item()),
			href: "/opds/v2.0/libraries".to_string(),
			_type: Some(OPDSLinkType::Custom("application/custom".to_string())),
			templated: Some(true),
			properties: Some(
				OPDSPropertiesBuilder::default()
					.dynamic_properties(OPDSDynamicProperties(serde_json::json!({
						"custom": "property"
					})))
					.build()
					.unwrap(),
			),
		};

		let finalized_base_link = finalizer.finalize_base_link(base_link);

		assert_eq!(
			finalized_base_link.href,
			"https://example.com/opds/v2.0/libraries"
		);
		assert_eq!(
			finalized_base_link
				.properties
				.unwrap()
				.dynamic_properties
				.unwrap()
				.0["custom"],
			"property"
		);
	}

	#[test]
	fn test_finalizer_finalize_navigation_link() {
		let finalizer = OPDSLinkFinalizer::new("https://example.com".to_string());

		let navigation_link = OPDSNavigationLink {
			title: "A library".to_string(),
			base_link: OPDSBaseLink {
				title: None,
				rel: Some(OPDSLinkRel::Start.item()),
				href: "/opds/v2.0/library/id".to_string(),
				_type: Some(OPDSLinkType::OpdsJson),
				..Default::default()
			},
		};

		let finalized_navigation_link = navigation_link.finalize(&finalizer);

		assert_eq!(
			finalized_navigation_link.base_link.href,
			"https://example.com/opds/v2.0/library/id"
		);
	}

	#[test]
	fn test_link_type_from_content_type() {
		assert_eq!(
			OPDSLinkType::from(ContentType::COMIC_RAR),
			OPDSLinkType::Cbr
		);
		assert_eq!(
			OPDSLinkType::from(ContentType::COMIC_ZIP),
			OPDSLinkType::Cbz
		);
		assert_eq!(OPDSLinkType::from(ContentType::RAR), OPDSLinkType::Rar);
		assert_eq!(OPDSLinkType::from(ContentType::ZIP), OPDSLinkType::Zip);
		assert_eq!(OPDSLinkType::from(ContentType::PDF), OPDSLinkType::Pdf);
		assert_eq!(
			OPDSLinkType::from(ContentType::EPUB_ZIP),
			OPDSLinkType::Epub
		);
		assert_eq!(
			OPDSLinkType::from(ContentType::JPEG),
			OPDSLinkType::ImageJpeg
		);
		assert_eq!(OPDSLinkType::from(ContentType::PNG), OPDSLinkType::ImagePng);
		assert_eq!(OPDSLinkType::from(ContentType::GIF), OPDSLinkType::ImageGif);
		assert_eq!(
			OPDSLinkType::from(ContentType::AVIF),
			OPDSLinkType::ImageAvif
		);
		assert_eq!(OPDSLinkType::from(ContentType::XHTML), OPDSLinkType::Xhtml);
	}

	#[test]
	fn test_custom_link_type_serialization() {
		let link_type = OPDSLinkType::Custom("application/custom".to_string());

		let json = serde_json::to_string(&link_type).unwrap();
		assert_eq!(json, r#""application/custom""#);
	}
}
