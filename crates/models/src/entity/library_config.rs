use async_graphql::SimpleObject;
use sea_orm::{
	entity::prelude::{async_trait::async_trait, *},
	ActiveValue::Set,
	FromQueryResult,
};

use crate::shared::{
	enums::{
		LibraryPattern, LibraryType, LibraryViewMode, ReadingDirection,
		ReadingImageScaleFit, ReadingMode,
	},
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
	#[sea_orm(column_type = "Text")]
	pub default_library_view_mode: LibraryViewMode,
	pub hide_series_view: bool,
	#[sea_orm(column_type = "Text")]
	pub library_type: LibraryType,
	#[sea_orm(default_value = "false")]
	pub skip_book_overview: bool,
	#[graphql(skip)]
	#[sea_orm(column_type = "Json", nullable)]
	pub thumbnail_config: Option<ImageProcessorOptions>,
	#[sea_orm(default_value = "false")]
	pub process_thumbnail_colors_even_without_config: bool,
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

#[async_trait]
impl ActiveModelBehavior for ActiveModel {
	async fn before_save<C>(mut self, _db: &C, insert: bool) -> Result<Self, DbErr>
	where
		C: ConnectionTrait,
	{
		if !insert {
			return Ok(self);
		}

		if self.convert_rar_to_zip.is_not_set() {
			self.convert_rar_to_zip = Set(false);
		}

		if self.hard_delete_conversions.is_not_set() {
			self.hard_delete_conversions = Set(false);
		}

		if self.default_reading_dir.is_not_set() {
			self.default_reading_dir = Set(ReadingDirection::Ltr);
		}

		if self.default_reading_mode.is_not_set() {
			self.default_reading_mode = Set(ReadingMode::Paged);
		}

		if self.default_reading_image_scale_fit.is_not_set() {
			self.default_reading_image_scale_fit = Set(ReadingImageScaleFit::Auto);
		}

		if self.generate_file_hashes.is_not_set() {
			self.generate_file_hashes = Set(false);
		}

		if self.generate_koreader_hashes.is_not_set() {
			self.generate_koreader_hashes = Set(false);
		}

		if self.process_metadata.is_not_set() {
			self.process_metadata = Set(false);
		}

		if self.watch.is_not_set() {
			self.watch = Set(false);
		}

		if self.library_pattern.is_not_set() {
			self.library_pattern = Set(LibraryPattern::SeriesBased);
		}

		if self.default_library_view_mode.is_not_set() {
			self.default_library_view_mode = Set(LibraryViewMode::Books);
		}

		if self.hide_series_view.is_not_set() {
			self.hide_series_view = Set(false);
		}

		if self.library_type.is_not_set() {
			self.library_type = Set(LibraryType::Mixed);
		}

		if self.skip_book_overview.is_not_set() {
			self.skip_book_overview = Set(false);
		}

		if self
			.process_thumbnail_colors_even_without_config
			.is_not_set()
		{
			self.process_thumbnail_colors_even_without_config = Set(false);
		}

		Ok(self)
	}
}
