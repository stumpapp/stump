//! A module for representing an OPDS 2.0 feed, as defined by the OPDS 2.0 spec at
//! https://drafts.opds.io/opds-2.0

use super::link::{Link, NavigationLink};

/// An OPDS 2.0 feed collection, considered the root of an OPDS 2.0 document.
///
/// See also:
/// - https://drafts.opds.io/opds-2.0.html#11-introduction
/// - https://github.com/opds-community/drafts/blob/main/schema/feed.schema.json
pub struct Feed {
	/// Links for the entire feed
	links: Vec<Link>,
	/// Links that an end user can follow in order to browse a catalog. It must be a compact collection.
	///
	/// See https://drafts.opds.io/opds-2.0#21-navigation
	navigation: Vec<NavigationLink>,
}
