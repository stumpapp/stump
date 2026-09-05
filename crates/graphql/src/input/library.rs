use async_graphql::{InputObject, MaybeUndefined, Result};
use models::{
	entity::{library, library_config},
	shared::{
		enums::{
			LibraryPattern, LibraryType, LibraryViewMode, ReadingDirection,
			ReadingImageScaleFit, ReadingMode,
		},
		ignore_rules::IgnoreRules,
		image_processor_options::ImageProcessorOptions,
	},
};
use sea_orm::{prelude::*, Set, Unchanged};

#[derive(Debug, InputObject)]
pub struct CreateOrUpdateLibraryInput {
	pub name: String,
	pub path: String,
	pub description: Option<String>,
	pub emoji: Option<String>,
	pub tags: Option<Vec<String>>,
	pub config: Option<LibraryConfigInput>,
	#[graphql(default = true)]
	pub scan_after_persist: bool,
}

impl CreateOrUpdateLibraryInput {
	pub fn into_active_model(
		self,
	) -> (library::ActiveModel, library_config::ActiveModel) {
		let CreateOrUpdateLibraryInput {
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
	pub library_type: LibraryType,
	pub default_library_view_mode: LibraryViewMode,
	pub hide_series_view: bool,
	pub skip_book_overview: bool,
	pub thumbnail_config: Option<ImageProcessorOptions>,
	pub process_thumbnail_colors_even_without_config: bool,
	pub default_reading_dir: ReadingDirection,
	pub default_reading_mode: ReadingMode,
	pub default_reading_image_scale_fit: ReadingImageScaleFit,
	pub ignore_rules: Option<Vec<String>>,
	pub oneshots_directory: Option<String>,
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
			library_type,
			default_library_view_mode,
			hide_series_view,
			skip_book_overview,
			thumbnail_config,
			process_thumbnail_colors_even_without_config,
			default_reading_dir,
			default_reading_mode,
			default_reading_image_scale_fit,
			ignore_rules,
			oneshots_directory,
		} = self;

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
			library_type: Set(library_type),
			default_library_view_mode: Set(default_library_view_mode),
			hide_series_view: Set(hide_series_view),
			skip_book_overview: Set(skip_book_overview),
			thumbnail_config: Set(thumbnail_config),
			process_thumbnail_colors_even_without_config: Set(
				process_thumbnail_colors_even_without_config,
			),
			default_reading_dir: Set(default_reading_dir),
			default_reading_mode: Set(default_reading_mode),
			default_reading_image_scale_fit: Set(default_reading_image_scale_fit),
			ignore_rules: Set(ignore_rules),
			oneshots_directory: Set(oneshots_directory),
			..Default::default()
		}
	}
}

// TODO: finally addressing an age-old annoyance lol but not doing it e2e yet just the backend for now. maybe i will as part of oneshots
// but ideally this does not scope creep anymore than i typically do with this project >:)
// also TODO if i ever have endless time, a macro could maybe be used to generate patch types from create types? that would be neat. the
// duplicate match arms could also be abstracted to a fn maybe, but the types were too gnarly to figure out during lunch
// also also clean up the stuff above

#[derive(Debug, Default, InputObject)]
pub struct PatchLibraryInput {
	pub name: Option<String>,
	pub path: Option<String>,
	pub description: MaybeUndefined<String>,
	pub emoji: MaybeUndefined<String>,
	pub tags: MaybeUndefined<Vec<String>>,
	pub config: Option<PatchLibraryConfigInput>,
	#[graphql(default = true)]
	pub scan_after_persist: bool,
}

impl PatchLibraryInput {
	/// Applies a **portion** of the patch to the library model. The caller is responsible
	/// for `.take()`ing the config and applying it separately, or just use
	/// [`PatchLibraryInput::apply`] to do both
	pub fn apply_to_model(self, model: library::Model) -> library::ActiveModel {
		let PatchLibraryInput {
			name,
			path,
			description,
			emoji,
			..
		} = self;

		library::ActiveModel {
			id: Unchanged(model.id),
			name: name.map(Set).unwrap_or(Unchanged(model.name)),
			description: match description {
				MaybeUndefined::Value(value) => Set(Some(value)),
				MaybeUndefined::Null => Set(None),
				MaybeUndefined::Undefined => Unchanged(model.description),
			},
			path: path.map(Set).unwrap_or(Unchanged(model.path)),
			status: Unchanged(model.status),
			thumbnail_meta: Unchanged(model.thumbnail_meta),
			thumbnail_path: Unchanged(model.thumbnail_path),
			created_at: Unchanged(model.created_at),
			emoji: match emoji {
				MaybeUndefined::Value(value) => Set(Some(value)),
				MaybeUndefined::Null => Set(None),
				MaybeUndefined::Undefined => Unchanged(model.emoji),
			},
			config_id: Unchanged(model.config_id),
			last_scanned_at: Unchanged(model.last_scanned_at),
			..Default::default()
		}
	}

	pub fn apply(
		mut self,
		library: library::Model,
		config: library_config::Model,
	) -> Result<(library::ActiveModel, library_config::ActiveModel)> {
		let config_patch = self.config.take();
		let library_model = self.apply_to_model(library);
		let config_model = match config_patch {
			Some(patch) => patch.apply_to_model(config)?,
			None => library_config::ActiveModel {
				id: Unchanged(config.id),
				library_id: Unchanged(config.library_id),
				..Default::default()
			},
		};

		Ok((library_model, config_model))
	}
}

#[derive(Debug, Default, InputObject)]
pub struct PatchLibraryConfigInput {
	pub convert_rar_to_zip: Option<bool>,
	pub hard_delete_conversions: Option<bool>,
	pub generate_file_hashes: Option<bool>,
	pub generate_koreader_hashes: Option<bool>,
	pub process_metadata: Option<bool>,
	pub watch: Option<bool>,
	pub library_pattern: Option<LibraryPattern>,
	pub library_type: Option<LibraryType>,
	pub default_library_view_mode: Option<LibraryViewMode>,
	pub hide_series_view: Option<bool>,
	pub skip_book_overview: Option<bool>,
	pub thumbnail_config: MaybeUndefined<ImageProcessorOptions>,
	pub process_thumbnail_colors_even_without_config: Option<bool>,
	pub default_reading_dir: Option<ReadingDirection>,
	pub default_reading_mode: Option<ReadingMode>,
	pub default_reading_image_scale_fit: Option<ReadingImageScaleFit>,
	pub ignore_rules: MaybeUndefined<Vec<String>>,
	pub oneshots_directory: MaybeUndefined<String>,
}

impl PatchLibraryConfigInput {
	pub fn apply_to_model(
		self,
		model: library_config::Model,
	) -> Result<library_config::ActiveModel> {
		let PatchLibraryConfigInput {
			convert_rar_to_zip,
			hard_delete_conversions,
			generate_file_hashes,
			generate_koreader_hashes,
			process_metadata,
			watch,
			library_pattern,
			library_type,
			default_library_view_mode,
			hide_series_view,
			skip_book_overview,
			thumbnail_config,
			process_thumbnail_colors_even_without_config,
			default_reading_dir,
			default_reading_mode,
			default_reading_image_scale_fit,
			ignore_rules,
			oneshots_directory,
		} = self;

		let ignore_rules = match ignore_rules {
			MaybeUndefined::Undefined => Unchanged(model.ignore_rules),
			MaybeUndefined::Null => Set(None),
			MaybeUndefined::Value(rules) => {
				let rules = IgnoreRules::new(rules)
					.map_err(|e| async_graphql::Error::new(e.to_string()))?;
				Set(Some(rules))
			},
		};

		Ok(library_config::ActiveModel {
			id: Unchanged(model.id),
			convert_rar_to_zip: convert_rar_to_zip
				.map(Set)
				.unwrap_or(Unchanged(model.convert_rar_to_zip)),
			hard_delete_conversions: hard_delete_conversions
				.map(Set)
				.unwrap_or(Unchanged(model.hard_delete_conversions)),
			generate_file_hashes: generate_file_hashes
				.map(Set)
				.unwrap_or(Unchanged(model.generate_file_hashes)),
			generate_koreader_hashes: generate_koreader_hashes
				.map(Set)
				.unwrap_or(Unchanged(model.generate_koreader_hashes)),
			process_metadata: process_metadata
				.map(Set)
				.unwrap_or(Unchanged(model.process_metadata)),
			watch: watch.map(Set).unwrap_or(Unchanged(model.watch)),
			library_pattern: library_pattern
				.map(Set)
				.unwrap_or(Unchanged(model.library_pattern)),
			library_type: library_type
				.map(Set)
				.unwrap_or(Unchanged(model.library_type)),
			default_library_view_mode: default_library_view_mode
				.map(Set)
				.unwrap_or(Unchanged(model.default_library_view_mode)),
			hide_series_view: hide_series_view
				.map(Set)
				.unwrap_or(Unchanged(model.hide_series_view)),
			skip_book_overview: skip_book_overview
				.map(Set)
				.unwrap_or(Unchanged(model.skip_book_overview)),
			thumbnail_config: match thumbnail_config {
				MaybeUndefined::Undefined => Unchanged(model.thumbnail_config),
				MaybeUndefined::Null => Set(None),
				MaybeUndefined::Value(config) => Set(Some(config)),
			},
			process_thumbnail_colors_even_without_config:
				process_thumbnail_colors_even_without_config
					.map(Set)
					.unwrap_or(Unchanged(
						model.process_thumbnail_colors_even_without_config,
					)),
			default_reading_dir: default_reading_dir
				.map(Set)
				.unwrap_or(Unchanged(model.default_reading_dir)),
			default_reading_mode: default_reading_mode
				.map(Set)
				.unwrap_or(Unchanged(model.default_reading_mode)),
			default_reading_image_scale_fit: default_reading_image_scale_fit
				.map(Set)
				.unwrap_or(Unchanged(model.default_reading_image_scale_fit)),
			ignore_rules,
			library_id: Unchanged(model.library_id),
			oneshots_directory: match oneshots_directory {
				MaybeUndefined::Undefined => Unchanged(model.oneshots_directory),
				MaybeUndefined::Null => Set(None),
				MaybeUndefined::Value(directory) => Set(Some(directory)),
			},
		})
	}
}
