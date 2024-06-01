//! A module for representing links in an OPDS 2.0 feed, as defined by the OPDS 2.0 spec at
//! https://drafts.opds.io/opds-2.0

use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

use super::utils::ArrayOrItem;

/// The relationship between a link and the resource it points to, as defined by the OPDS 2.0 spec.
///
/// This struct was derived from multiple sources within the OPDS 2.0 spec, including:
/// - https://drafts.opds.io/opds-2.0#21-navigation
/// - https://drafts.opds.io/opds-2.0#4-pagination
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LinkRel {
	#[serde(rename = "self")]
	SelfLink,
	Start,
	Current,
	Search,
	Next,
	Previous,
	First,
	Last,
}

/// The type of the linked resource, which generally follows the MIME type format.
///
/// This struct was derived from multiple sources within the OPDS 2.0 spec, including:
/// - https://drafts.opds.io/opds-2.0.html#23-images
#[derive(Debug, Serialize, Deserialize)]
pub enum LinkType {
	OpdsJson,  // "application/opds+json"
	OpdsAuth,  // "application/opds-authentication+json"
	ImageJpeg, // "image/jpeg"
	ImagePng,  // "image/png"
	ImageGif,  // "image/gif"
	ImageAvif, // "image/avif"'
	Zip,       // "application/zip"
	Epub,      // "application/epub+zip"
	Custom(String),
}

/// A struct for representing the common elements of an OPDS link. Other link types can be derived from this struct,
/// such as [ImageLink] and [NavigationLink], and flattened for serialization into a unfied JSON object.
#[skip_serializing_none]
#[derive(Debug, Serialize, Deserialize)]
pub struct BaseLink {
	/// The title of the linked resource, if available
	pub title: Option<String>,
	/// The relationship between the link and the resource it points to.
	/// This can be a single value or an array of values.
	///
	/// An example of a multi-valued link rel might be: ["first", "previous"] or ["next", "last"].
	pub rel: ArrayOrItem<LinkRel>,
	/// The URI of the linked resource
	pub href: String,
	/// The type of the linked resource, which generally follows the MIME type format
	pub _type: Option<LinkType>,
	// TODO: confirm what this means, I couldn't find it referenced much in the spec
	/// Whether the link is a templated link, i.e. a URI that can be expanded.
	/// This is useful for search links, for example.
	///
	/// Example: `https://example.com/search{?query}`
	pub templated: Option<bool>,
}

impl Default for BaseLink {
	fn default() -> Self {
		Self {
			title: None,
			rel: ArrayOrItem::Item(LinkRel::SelfLink),
			href: String::new(),
			_type: None,
			templated: None,
		}
	}
}

/// A struct for representing an image link, which is a special type of link that points to an image resource.
///
/// See https://drafts.opds.io/opds-2.0.html#23-images
#[skip_serializing_none]
#[derive(Debug, Serialize, Deserialize)]
pub struct ImageLink {
	/// The height of the image in pixels
	height: Option<i32>,
	/// The width of the image in pixels
	width: Option<i32>,
	#[serde(flatten)]
	base_link: BaseLink,
}

/// A struct for representing a navigation link, which is a special type of link that an end user can follow in order to
/// browse a catalog. It must be a compact collection and contain a title.
#[derive(Debug, Serialize, Deserialize)]
pub struct NavigationLink {
	pub title: String,
	#[serde(flatten)]
	pub base_link: BaseLink,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Link {
	Link(BaseLink),
	Navigation(NavigationLink),
	Image(ImageLink),
}
