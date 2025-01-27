mod common;
mod media_metadata;
mod metadata_source;
pub mod page_dimension;
pub(crate) mod prisma_macros;
mod series_metadata;

pub use common::{age_rating_deserializer, parse_age_restriction};
pub use media_metadata::*;
pub use metadata_source::{
	MetadataSourceEntry, MetadataSourceSchema, MetadataSourceSchemaField,
	MetadataSourceSchemaFieldType,
};
pub use page_dimension::{PageDimension, PageDimensionsEntity};
pub use series_metadata::*;
