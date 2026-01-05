use sea_orm_migration::async_trait::async_trait;
pub use sea_orm_migration::*;

mod m20250807_202824_init;
mod m20251013_233701_add_media_metadata_fields;
mod m20251020_145410_add_thumbnail_ratio;
mod m20251112_000000_add_oidc_to_users;
mod m20251117_220701_thumbnail_placeholders;
mod m20251118_183043_media_analysis;
mod m20251220_000000_library_view_mode;
mod m20251229_185620_fancy_animations_pref;
mod m20251229_200000_thumbnail_placeholder_style_pref;

pub struct Migrator;

#[async_trait]
impl MigratorTrait for Migrator {
	fn migrations() -> Vec<Box<dyn MigrationTrait>> {
		vec![
			Box::new(m20250807_202824_init::Migration),
			Box::new(m20251013_233701_add_media_metadata_fields::Migration),
			Box::new(m20251020_145410_add_thumbnail_ratio::Migration),
			Box::new(m20251112_000000_add_oidc_to_users::Migration),
			Box::new(m20251117_220701_thumbnail_placeholders::Migration),
			Box::new(m20251118_183043_media_analysis::Migration),
			Box::new(m20251220_000000_library_view_mode::Migration),
			Box::new(m20251229_185620_fancy_animations_pref::Migration),
			Box::new(m20251229_200000_thumbnail_placeholder_style_pref::Migration),
		]
	}
}
