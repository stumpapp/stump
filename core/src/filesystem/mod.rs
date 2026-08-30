// TODO: remove pubs, expose only what is needed

pub mod archive;
mod common;
mod content_type;
mod directory_listing;
pub(crate) mod error;
mod hash;
pub mod image;
pub mod media;
pub mod metadata;
mod oneshot;
pub mod scanner;
pub mod series;

pub use common::*;
pub use content_type::ContentType;
pub use directory_listing::{
	DirectoryListing, DirectoryListingFile, DirectoryListingIgnoreParams,
	DirectoryListingInput,
};
pub use error::FileError;

// TODO(chore): its been a while since ive spent meaningful time in this crate and honestly
// don't love how its organized after years of slowly-disorganized growth. obv very overall
// unimportant, but would be nice to maybe rethink the structure and whether this can
// actually just be its own self-contained crate(s)
