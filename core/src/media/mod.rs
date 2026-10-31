//! Media management for Stump, including file analysis and format-specific processors.
//!
//! The [`prepare`] module takes a scanned repr of a book and translates it into an
//! insertable entity for the database

pub mod analysis;
pub(crate) mod prepare;
pub mod processor;
pub mod series;
mod utils;

#[cfg(test)]
pub(crate) use tests::fixtures;
