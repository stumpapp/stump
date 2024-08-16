use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{filesystem::image::ImageProcessorOptions, prisma::library_options};

use super::{IgnoreRules, LibraryPattern};

#[derive(Debug, Clone, Deserialize, Serialize, Type, ToSchema, Default)]
pub struct LibraryOptions {
	// TODO: remove optionality
	pub id: Option<String>,
	pub convert_rar_to_zip: bool,
	pub hard_delete_conversions: bool,
	pub library_pattern: LibraryPattern,
	pub thumbnail_config: Option<ImageProcessorOptions>,
	#[serde(default)]
	pub ignore_rules: IgnoreRules,
	// TODO(prisma 0.7.0): Nested create
	// https://github.com/Brendonovich/prisma-client-rust/issues/44
	pub library_id: Option<String>,
}

impl LibraryOptions {
	pub fn is_collection_based(&self) -> bool {
		self.library_pattern == LibraryPattern::CollectionBased
	}
}

// TODO: This should probably be a TryFrom, as annoying as that is
impl From<library_options::Data> for LibraryOptions {
	fn from(data: library_options::Data) -> LibraryOptions {
		LibraryOptions {
			id: Some(data.id),
			convert_rar_to_zip: data.convert_rar_to_zip,
			hard_delete_conversions: data.hard_delete_conversions,
			library_pattern: LibraryPattern::from(data.library_pattern),
			thumbnail_config: data.thumbnail_config.map(|config| {
				ImageProcessorOptions::try_from(config).unwrap_or_default()
			}),
			ignore_rules: data
				.ignore_rules
				.map_or_else(IgnoreRules::default, |rules| {
					IgnoreRules::try_from(rules).unwrap_or_default()
				}),
			library_id: data.library_id,
		}
	}
}

impl From<&library_options::Data> for LibraryOptions {
	fn from(data: &library_options::Data) -> LibraryOptions {
		data.clone().into()
	}
}
