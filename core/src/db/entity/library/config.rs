use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{filesystem::image::ImageProcessorOptions, prisma::library_config};

use super::{IgnoreRules, LibraryPattern};

#[derive(Debug, Clone, Deserialize, Serialize, Type, ToSchema, Default)]
pub struct LibraryConfig {
	#[specta(optional)]
	pub id: Option<String>,
	pub convert_rar_to_zip: bool,
	pub hard_delete_conversions: bool,
	pub generate_file_hashes: bool,
	pub process_metadata: bool,
	pub library_pattern: LibraryPattern,
	pub thumbnail_config: Option<ImageProcessorOptions>,
	#[serde(default)]
	pub ignore_rules: IgnoreRules,
	// TODO(prisma-nested-create): Refactor once nested create is supported
	// https://github.com/Brendonovich/prisma-client-rust/issues/44
	#[specta(optional)]
	pub library_id: Option<String>,
}

impl LibraryConfig {
	pub fn is_collection_based(&self) -> bool {
		self.library_pattern == LibraryPattern::CollectionBased
	}
}

// TODO: This should probably be a TryFrom, as annoying as that is
impl From<library_config::Data> for LibraryConfig {
	fn from(data: library_config::Data) -> LibraryConfig {
		LibraryConfig {
			id: Some(data.id),
			convert_rar_to_zip: data.convert_rar_to_zip,
			hard_delete_conversions: data.hard_delete_conversions,
			generate_file_hashes: data.generate_file_hashes,
			process_metadata: data.process_metadata,
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

impl From<&library_config::Data> for LibraryConfig {
	fn from(data: &library_config::Data) -> LibraryConfig {
		data.clone().into()
	}
}
