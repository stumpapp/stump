pub mod error;
pub mod media;
pub mod provider;
pub mod series;
pub(crate) mod utils;

pub use error::MetadataError;
pub use media::ProcessedMediaMetadata;
pub use series::{ProcessedSeriesMetadata, SeriesJson};
