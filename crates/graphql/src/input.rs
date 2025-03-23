use async_graphql::{InputObject, Json};
use models::{
	entity::{library, library_config},
	shared::{
		enums::{LibraryPattern, ReadingDirection, ReadingImageScaleFit, ReadingMode},
		ignore_rules::IgnoreRules,
		image_processor_options::ImageProcessorOptions,
	},
};
use sea_orm::{prelude::*, Set};

// TODO: might be better to either:
// 1. Colocate inputs with the objects? (e.g., `object/library.rs`)
// 2. Group inputs in own modules _like_ objects but not in same file? (e.g., `input/library.rs`)

#[derive(Debug, InputObject)]
pub struct CreateLibraryInput {
	pub name: String,
	pub description: Option<String>,
	pub path: String,
	pub emoji: Option<String>,
	pub tags: Option<Vec<String>>,
	pub config: Option<LibraryConfigInput>,
	pub scan_on_create: bool,
}

impl CreateLibraryInput {
	pub fn into_active_model(
		self,
	) -> (library::ActiveModel, library_config::ActiveModel) {
		let CreateLibraryInput {
			name,
			description,
			path,
			emoji,
			config,
			..
		} = self;

		let id = Uuid::new_v4().to_string();
		let library = library::ActiveModel {
			id: Set(id.clone()),
			name: Set(name),
			description: Set(description),
			path: Set(path),
			emoji: Set(emoji),
			// tags: Set(tags),
			// scan_on_create: Set(scan_on_create),
			..Default::default()
		};

		let config = library_config::ActiveModel {
			library_id: Set(Some(id)),
			..config.unwrap_or_default().into_active_model()
		};

		(library, config)
	}
}

#[derive(Debug, Default, InputObject)]
pub struct LibraryConfigInput {
	pub convert_rar_to_zip: bool,
	pub hard_delete_conversions: bool,
	pub generate_file_hashes: bool,
	pub generate_koreader_hashes: bool,
	pub process_metadata: bool,
	pub watch: bool,
	pub library_pattern: LibraryPattern,
	pub thumbnail_config: Option<Json<ImageProcessorOptions>>,
	pub default_reading_dir: ReadingDirection,
	pub default_reading_mode: ReadingMode,
	pub default_reading_image_scale_fit: ReadingImageScaleFit,
	pub ignore_rules: Option<Vec<String>>,
}

impl LibraryConfigInput {
	pub fn into_active_model(self) -> library_config::ActiveModel {
		let LibraryConfigInput {
			convert_rar_to_zip,
			hard_delete_conversions,
			generate_file_hashes,
			generate_koreader_hashes,
			process_metadata,
			watch,
			library_pattern,
			thumbnail_config,
			default_reading_dir,
			default_reading_mode,
			default_reading_image_scale_fit,
			ignore_rules,
		} = self;

		let thumbnail_config = thumbnail_config.map(|config| config.0);

		let ignore_rules = ignore_rules
			.map(IgnoreRules::new)
			.transpose()
			.unwrap_or_default();

		library_config::ActiveModel {
			convert_rar_to_zip: Set(convert_rar_to_zip),
			hard_delete_conversions: Set(hard_delete_conversions),
			generate_file_hashes: Set(generate_file_hashes),
			generate_koreader_hashes: Set(generate_koreader_hashes),
			process_metadata: Set(process_metadata),
			watch: Set(watch),
			library_pattern: Set(library_pattern),
			thumbnail_config: Set(thumbnail_config),
			default_reading_dir: Set(default_reading_dir),
			default_reading_mode: Set(default_reading_mode),
			default_reading_image_scale_fit: Set(default_reading_image_scale_fit),
			ignore_rules: Set(ignore_rules),
			..Default::default()
		}
	}
}
