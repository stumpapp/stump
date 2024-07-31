//! Defines an interface for writing OPDS 2.0 complaint JSON, based on the specification defined at
//! https://drafts.opds.io/opds-2.0. It should be noted that while the OPDS 2.0 spec is still in a
//! draft state, it is largely stable and unlikely to change in any significant way.

pub mod authentication;
mod error;
pub mod feed;
pub mod group;
pub mod link;
pub mod metadata;
mod prisma_macros;
pub mod progression;
pub mod properties;
pub mod publication;
mod utils;

pub use error::OPDSV2Error;
pub use prisma_macros::books_as_publications;
pub use utils::{ArrayOrItem, OPDSV2PrismaExt};

// TODO(OPDS-V2): facet (kinda confused on this one still)
// TODO(OPDS-V2): constants for the various OPDS 2.0 routes
