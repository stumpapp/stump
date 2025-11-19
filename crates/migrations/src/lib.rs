use sea_orm_migration::async_trait::async_trait;
pub use sea_orm_migration::*;

mod m20250807_202824_init;
mod m20251013_233701_add_media_metadata_fields;
mod m20251020_145410_add_thumbnail_ratio;
mod m20251117_220701_thumbnail_placeholders;
mod m20251118_183043_media_analysis;

pub struct Migrator;

#[async_trait]
impl MigratorTrait for Migrator {
	fn migrations() -> Vec<Box<dyn MigrationTrait>> {
		vec![
			Box::new(m20250807_202824_init::Migration),
			Box::new(m20251013_233701_add_media_metadata_fields::Migration),
			Box::new(m20251020_145410_add_thumbnail_ratio::Migration),
			Box::new(m20251117_220701_thumbnail_placeholders::Migration),
			Box::new(m20251118_183043_media_analysis::Migration),
		]
	}
}
