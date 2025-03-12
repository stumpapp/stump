use sea_orm::entity::prelude::*;

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
	pub default_reading_image_scale_fit: String,
	pub generate_file_hashes: bool,
	pub generate_koreader_hashes: bool,
	pub process_metadata: bool,
	#[sea_orm(column_type = "Text")]
	pub library_pattern: String,
	#[sea_orm(column_type = "Blob", nullable)]
	pub thumbnail_config: Option<Vec<u8>>,
	#[sea_orm(column_type = "Blob", nullable)]
	pub ignore_rules: Option<Vec<u8>>,
	#[sea_orm(column_type = "Text", nullable)]
	pub library_id: Option<String>,
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
