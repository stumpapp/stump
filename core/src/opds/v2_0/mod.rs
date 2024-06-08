//! Defines an interface for writing OPDS-complaint JSON, based on the specification defined at
//! https://drafts.opds.io/opds-2.0

pub mod authentication;
pub mod feed;
pub mod group;
pub mod link;
pub mod metadata;
pub mod properties;
pub mod publication;
mod utils;

pub use utils::{ArrayOrItem, OPDSV2PrismaExt};

// TODO: publication
// TODO: facet (kinda confused on this one still)

// TODO: lots of (de)serialization testing!
