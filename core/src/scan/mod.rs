//! The indexing modules for Stump, also referred to as the scanner. A lot of the indexing logic
//! itself lives in the [`walk`] module

pub mod library;
pub mod options;
pub mod series;
mod tag_cache;
pub(crate) mod utils;
mod walk;
pub mod watcher;
