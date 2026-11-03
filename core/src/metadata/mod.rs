//! Metadata processing for media and series, including fetching and
//! applying metadata from external providers

pub mod error;
pub mod media;
pub mod membership;
pub mod provider;
pub mod series;
pub(crate) mod utils;

pub use error::MetadataError;
pub use media::ProcessedMediaMetadata;
pub use series::{ProcessedSeriesMetadata, SeriesJson};
