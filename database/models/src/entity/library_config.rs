use sea_orm::entity::prelude::*;

use crate::shared::{
	enums::{LibraryPattern, ReadingImageScaleFit},
	ignore_rules::IgnoreRules,
	image_processor_options::ImageProcessorOptions,
};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "library_configs")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	pub convert_rar_to_zip: bool,
	pub hard_delete_conversions: bool,
	#[sea_orm(column_type = "Text")]
	pub default_reading_dir: String,
	#[sea_orm(column_type = "Text")]
	pub default_reading_mode: String,
	#[sea_orm(column_type = "Text")]
	pub default_reading_image_scale_fit: ReadingImageScaleFit,
	pub generate_file_hashes: bool,
	pub generate_koreader_hashes: bool,
	pub process_metadata: bool,
	pub watch: bool,
	#[sea_orm(column_type = "Text")]
	pub library_pattern: LibraryPattern,
	#[sea_orm(column_type = "Json", nullable)]
	pub thumbnail_config: Option<ImageProcessorOptions>,
	#[sea_orm(column_type = "Json", nullable)]
	pub ignore_rules: Option<IgnoreRules>,
	#[sea_orm(column_type = "Text", nullable)]
	pub library_id: Option<String>,
}

impl Model {
	pub fn is_collection_based(&self) -> bool {
		self.library_pattern == LibraryPattern::CollectionBased
	}

	pub fn ignore_rules(&self) -> IgnoreRules {
		self.ignore_rules.clone().unwrap_or_default()
	}
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(has_one = "super::library::Entity")]
	Library,
}

impl Related<super::library::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Library.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}
