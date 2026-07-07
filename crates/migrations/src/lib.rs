use sea_orm_migration::async_trait::async_trait;
pub use sea_orm_migration::*;

mod m20250807_202824_init;
mod m20251013_233701_add_media_metadata_fields;
mod m20251020_145410_add_thumbnail_ratio;
mod m20251112_000000_add_oidc_to_users;
mod m20251116_000000_book_club_enhancements;
mod m20251117_220701_thumbnail_placeholders;
mod m20251118_183043_media_analysis;
mod m20251220_000000_library_view_mode;
mod m20251229_185620_fancy_animations_pref;
mod m20251229_200000_thumbnail_placeholder_style_pref;
mod m20260108_000000_add_series_metadata_fields;
mod m20260116_000000_rewrite_media_annotations;
mod m20260118_204601_add_bookmark_created_at;
mod m20260128_000000_add_library_type;
mod m20260207_000000_metadata_provider_integration;
mod m20260220_000000_user_avatar_path;
mod m20260307_000000_library_skip_book_overview;
mod m20260311_000000_scheduled_jobs_redesign;
mod m20260404_185829_add_name_indexes;
mod m20260406_000000_add_kobo_sync_sessions;
mod m20260505_231341_jwt_secrets;
mod m20260519_192218_reading_sessions_v2;
mod m20260523_220757_rename_registered_reading_devices;
mod m20260525_165704_roundness_preference;
mod m20260601_000000_add_scanned_directory;
mod m20260603_164540_thumbnail_roundness_preference;
mod m20260613_000000_add_series_path_index;
mod m20260617_200820_rm_thumbnails_in_headers_pref;

pub struct Migrator;

#[async_trait]
impl MigratorTrait for Migrator {
	fn migrations() -> Vec<Box<dyn MigrationTrait>> {
		vec![
			Box::new(m20250807_202824_init::Migration),
			Box::new(m20251013_233701_add_media_metadata_fields::Migration),
			Box::new(m20251020_145410_add_thumbnail_ratio::Migration),
			Box::new(m20251112_000000_add_oidc_to_users::Migration),
			Box::new(m20251116_000000_book_club_enhancements::Migration),
			Box::new(m20251117_220701_thumbnail_placeholders::Migration),
			Box::new(m20251118_183043_media_analysis::Migration),
			Box::new(m20251220_000000_library_view_mode::Migration),
			Box::new(m20251229_185620_fancy_animations_pref::Migration),
			Box::new(m20251229_200000_thumbnail_placeholder_style_pref::Migration),
			Box::new(m20260108_000000_add_series_metadata_fields::Migration),
			Box::new(m20260116_000000_rewrite_media_annotations::Migration),
			Box::new(m20260118_204601_add_bookmark_created_at::Migration),
			Box::new(m20260128_000000_add_library_type::Migration),
			Box::new(m20260207_000000_metadata_provider_integration::Migration),
			Box::new(m20260220_000000_user_avatar_path::Migration),
			Box::new(m20260311_000000_scheduled_jobs_redesign::Migration),
			Box::new(m20260307_000000_library_skip_book_overview::Migration),
			Box::new(m20260404_185829_add_name_indexes::Migration),
			Box::new(m20260406_000000_add_kobo_sync_sessions::Migration),
			Box::new(m20260505_231341_jwt_secrets::Migration),
			Box::new(m20260519_192218_reading_sessions_v2::Migration),
			Box::new(m20260523_220757_rename_registered_reading_devices::Migration),
			Box::new(m20260525_165704_roundness_preference::Migration),
			Box::new(m20260603_164540_thumbnail_roundness_preference::Migration),
			Box::new(m20260601_000000_add_scanned_directory::Migration),
			Box::new(m20260613_000000_add_series_path_index::Migration),
			Box::new(m20260617_200820_rm_thumbnails_in_headers_pref::Migration),
		]
	}
}
