//! A module for representing links in an OPDS 2.0 feed, as defined by the OPDS 2.0 spec at
//! https://drafts.opds.io/opds-2.0

use derive_builder::Builder;
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

use crate::prisma::{library, series};

use super::{properties::OPDSDynamicProperties, utils::ArrayOrItem};

/// The relationship between a link and the resource it points to, as defined by the OPDS 2.0 spec.
///
/// This struct was derived from multiple sources within the OPDS 2.0 spec, including:
/// - https://drafts.opds.io/opds-2.0#21-navigation
/// - https://drafts.opds.io/opds-2.0#4-pagination
#[derive(Debug, Clone, Serialize, Deserialize)]
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
}

impl OPDSLinkRel {
	pub fn item(self) -> ArrayOrItem<OPDSLinkRel> {
		ArrayOrItem::Item(self)
	}

	pub fn array(rels: Vec<OPDSLinkRel>) -> ArrayOrItem<OPDSLinkRel> {
		ArrayOrItem::Array(rels)
	}
}

/// The type of the linked resource, which generally follows the MIME type format.
///
/// This struct was derived from multiple sources within the OPDS 2.0 spec, including:
/// - https://drafts.opds.io/opds-2.0.html#23-images
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OPDSLinkType {
	#[serde(rename = "application/opds+json")]
	OpdsJson,
	#[serde(rename = "http://opds-spec.org/auth/document")]
	OpdsAuth,
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
	#[serde(rename = "application/zip")]
	Zip,
	#[serde(rename = "application/epub+zip")]
	Epub,
	#[serde(untagged)]
	Custom(String),
}

/// A struct for representing the common elements of an OPDS link. Other link types can be derived from this struct,
/// such as [OPDSImageLink] and [OPDSNavigationLink], and flattened for serialization into a unfied JSON object.
#[skip_serializing_none]
#[derive(Debug, Clone, Builder, Serialize, Deserialize)]
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
	pub properties: Option<OPDSDynamicProperties>,
}

impl Default for OPDSBaseLink {
	fn default() -> Self {
		Self {
			title: None,
			rel: None,
			href: String::new(),
			_type: None,
			templated: None,
			properties: None,
		}
	}
}

/// A struct for representing an image link, which is a special type of link that points to an image resource.
///
/// See https://drafts.opds.io/opds-2.0.html#23-images
#[skip_serializing_none]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OPDSImageLink {
	/// The height of the image in pixels
	height: Option<i32>,
	/// The width of the image in pixels
	width: Option<i32>,
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
}

// TODO(311): What should rel be?
impl From<library::Data> for OPDSNavigationLink {
	fn from(library: library::Data) -> Self {
		OPDSNavigationLink {
			title: library.name,
			base_link: OPDSBaseLink {
				href: format!("/opds/v2.0/libraries/{}", library.id),
				_type: Some(OPDSLinkType::OpdsJson),
				..Default::default()
			},
		}
	}
}

impl From<series::Data> for OPDSNavigationLink {
	fn from(series: series::Data) -> Self {
		OPDSNavigationLink {
			title: series.name,
			base_link: OPDSBaseLink {
				href: format!("/opds/v2.0/series/{}", series.id),
				_type: Some(OPDSLinkType::OpdsJson),
				..Default::default()
			},
		}
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use prisma_client_rust::chrono;

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
			properties: Some(OPDSDynamicProperties(serde_json::json!({
				"custom": "property"
			}))),
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
		let library = library::Data {
			id: "123".to_string(),
			name: "A library".to_string(),
			created_at: chrono::Utc::now().into(),
			updated_at: chrono::Utc::now().into(),
			description: None,
			emoji: None,
			hidden_from_users: None,
			job_schedule_config: None,
			job_schedule_config_id: None,
			library_options: None,
			library_options_id: String::default(),
			path: String::default(),
			series: None,
			status: String::from("READY"),
			tags: None,
			user_visits: None,
		};

		let link: OPDSNavigationLink = library.into();

		let json = serde_json::to_string(&link).unwrap();
		assert_eq!(
			json,
			r#"{"title":"A library","href":"/opds/v2.0/libraries/123","type":"application/opds+json"}"#
		);
	}
}
