//! A module for representing links in an OPDS 2.0 feed, as defined by the OPDS 2.0 spec at
//! https://drafts.opds.io/opds-2.0

use derive_builder::Builder;
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

use crate::prisma::library;

use super::utils::ArrayOrItem;

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
	#[serde(rename = "application/opds-publication+json")]
	OpdsAuth,
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
	pub rel: ArrayOrItem<OPDSLinkRel>,
	/// The URI of the linked resource
	pub href: String,
	/// The type of the linked resource, which generally follows the MIME type format
	#[serde(rename = "type")]
	pub _type: Option<OPDSLinkType>,
	// TODO: confirm what this means, I couldn't find it referenced much in the spec
	/// Whether the link is a templated link, i.e. a URI that can be expanded.
	/// This is useful for search links, for example.
	///
	/// Example: `https://example.com/search{?query}`
	pub templated: Option<bool>,
	// pub children: Option<Vec<Link>>,
	// TODO: separate into own module?
	pub properties: Option<serde_json::Value>,
}

impl Default for OPDSBaseLink {
	fn default() -> Self {
		Self {
			title: None,
			rel: ArrayOrItem::Item(OPDSLinkRel::SelfLink),
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum OPDSLink {
	Link(OPDSBaseLink),
	Navigation(OPDSNavigationLink),
	Image(OPDSImageLink),
}

impl From<library::Data> for OPDSNavigationLink {
	fn from(library: library::Data) -> Self {
		OPDSNavigationLinkBuilder::default()
			.title(library.name)
			.base_link(
				OPDSBaseLinkBuilder::default()
					.href(format!("/opds/v2.0/libraries/{}", library.id))
					._type(Some(OPDSLinkType::OpdsJson))
					.build()
					.unwrap(),
			)
			.build()
			.unwrap()
	}
}
