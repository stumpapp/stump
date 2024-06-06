//! Defines an interface for writing OPDS-complaint JSON, based on the specification defined at
//! https://drafts.opds.io/opds-2.0

pub mod authentication;
pub mod feed;
pub mod group;
pub mod link;
pub mod metadata;
mod utils;

pub use utils::ArrayOrItem;

// TODO: publication
// TODO: facet (kinda confused on this one still)
