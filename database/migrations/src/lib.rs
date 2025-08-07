use sea_orm_migration::async_trait::async_trait;
pub use sea_orm_migration::*;

pub struct Migrator;

#[async_trait]
impl MigratorTrait for Migrator {
	fn migrations() -> Vec<Box<dyn MigrationTrait>> {
		vec![]
	}
}
