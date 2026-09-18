pub mod error;
pub mod media;
pub mod provider;
pub mod series;
pub mod spec;
pub(crate) mod utils;
pub mod writer;

pub use error::MetadataError;
pub use media::ProcessedMediaMetadata;
pub use series::{ProcessedSeriesMetadata, SeriesJson};
pub use writer::update_embedded_metadata;
