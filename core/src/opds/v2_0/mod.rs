//! Defines an interface for writing OPDS-complaint JSON, based on the specification defined at
//! https://drafts.opds.io/opds-2.0

pub mod authentication;
mod error;
pub mod feed;
pub mod group;
pub mod link;
pub mod metadata;
mod prisma_macros;
pub mod properties;
pub mod publication;
mod utils;

pub use error::OPDSV2Error;
pub use prisma_macros::books_as_publications;
pub use utils::{ArrayOrItem, OPDSV2PrismaExt};

// TODO: facet (kinda confused on this one still)

// TODO: lots of (de)serialization testing!
