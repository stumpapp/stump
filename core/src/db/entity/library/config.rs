use std::str::FromStr;

use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{
	db::entity::common::{ReadingDirection, ReadingImageScaleFit, ReadingMode},
	filesystem::{
		image::ImageProcessorOptions,
		scanner::{ScanOptions, VisitStrategy},
	},
	prisma::library_config,
};

use super::{IgnoreRules, LibraryPattern};

#[derive(Debug, Clone, Deserialize, Serialize, Type, ToSchema, Default)]
pub struct LibraryConfig {
	#[specta(optional)]
	pub id: Option<String>,
	pub convert_rar_to_zip: bool,
	pub hard_delete_conversions: bool,
	pub generate_file_hashes: bool,
	pub generate_koreader_hashes: bool,
	pub process_metadata: bool,
	pub library_pattern: LibraryPattern,
	pub thumbnail_config: Option<ImageProcessorOptions>,
	#[serde(default)] // TODO: remove this after update with experimental
	pub default_reading_dir: ReadingDirection,
	#[serde(default)] // TODO: remove this after update with experimental
	pub default_reading_mode: ReadingMode,
	#[serde(default)]
	pub default_reading_image_scale_fit: ReadingImageScaleFit,
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

	pub fn apply(&mut self, options: ScanOptions) {
		match options.visit_strategy {
			VisitStrategy::RegenMeta => {
				tracing::debug!("Altering library config to process metadata");
				self.process_metadata = true;
			},
			VisitStrategy::RegenHashes => {
				tracing::debug!("Altering library config to generate hashes");
				self.generate_file_hashes = true;
				// self.generate_koreader_hashes = true;
			},
			_ => {},
		}
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
			generate_koreader_hashes: data.generate_koreader_hashes,
			process_metadata: data.process_metadata,
			library_pattern: LibraryPattern::from(data.library_pattern),
			default_reading_dir: ReadingDirection::from_str(
				data.default_reading_dir.as_str(),
			)
			.unwrap_or_default(),
			default_reading_mode: ReadingMode::from_str(
				data.default_reading_mode.as_str(),
			)
			.unwrap_or_default(),
			default_reading_image_scale_fit: ReadingImageScaleFit::from_str(
				data.default_reading_image_scale_fit.as_str(),
			)
			.unwrap_or_default(),
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
