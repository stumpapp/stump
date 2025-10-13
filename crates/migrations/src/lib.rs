use sea_orm_migration::async_trait::async_trait;
pub use sea_orm_migration::*;

mod m20250807_202824_init;
mod m20251013_233701_add_media_metadata_fields;

pub struct Migrator;

#[async_trait]
impl MigratorTrait for Migrator {
	fn migrations() -> Vec<Box<dyn MigrationTrait>> {
		vec![
			Box::new(m20250807_202824_init::Migration),
			Box::new(m20251013_233701_add_media_metadata_fields::Migration),
		]
	}
}
