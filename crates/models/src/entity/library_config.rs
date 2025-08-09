use async_graphql::SimpleObject;
use sea_orm::{entity::prelude::*, FromQueryResult};

use crate::shared::{
	enums::{LibraryPattern, ReadingDirection, ReadingImageScaleFit, ReadingMode},
	ignore_rules::IgnoreRules,
	image_processor_options::ImageProcessorOptions,
};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "LibraryConfigModel")]
#[sea_orm(table_name = "library_configs")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = true)]
	pub id: i32,
	pub convert_rar_to_zip: bool,
	pub hard_delete_conversions: bool,
	#[sea_orm(column_type = "Text")]
	pub default_reading_dir: ReadingDirection,
	#[sea_orm(column_type = "Text")]
	pub default_reading_mode: ReadingMode,
	#[sea_orm(column_type = "Text")]
	pub default_reading_image_scale_fit: ReadingImageScaleFit,
	pub generate_file_hashes: bool,
	pub generate_koreader_hashes: bool,
	pub process_metadata: bool,
	pub watch: bool,
	#[sea_orm(column_type = "Text")]
	pub library_pattern: LibraryPattern,
	#[graphql(skip)]
	#[sea_orm(column_type = "Json", nullable)]
	pub thumbnail_config: Option<ImageProcessorOptions>,
	#[sea_orm(column_type = "Json", nullable)]
	#[graphql(skip)]
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

#[derive(Clone, Debug, FromQueryResult)]
pub struct LibraryConfigThumbnailConfig {
	pub thumbnail_config: Option<ImageProcessorOptions>,
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
