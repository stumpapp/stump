use models::entity::{
	finished_reading_session, kobo_sync_session, library, library_exclusion, media,
	media_metadata, reading_session, registered_reading_device, series, series_metadata,
	user, user_preferences,
};
use sea_orm::{ConnectionTrait, Database, DbBackend, DbConn, DbErr, Schema};
pub async fn test_database() -> DbConn {
	let db = Database::connect("sqlite::memory:")
		.await
		.expect("failed to connect to test database");

	create_database_tables(&db)
		.await
		.expect("failed to create test database tables");

	db
}

pub async fn create_database_tables(db: &DbConn) -> Result<(), DbErr> {
	let schema = Schema::new(DbBackend::Sqlite);

	let tables = [
		schema.create_table_from_entity(media::Entity),
		schema.create_table_from_entity(media_metadata::Entity),
		schema.create_table_from_entity(series::Entity),
		schema.create_table_from_entity(series_metadata::Entity),
		schema.create_table_from_entity(library_exclusion::Entity),
		schema.create_table_from_entity(kobo_sync_session::Entity),
		schema.create_table_from_entity(user::Entity),
		schema.create_table_from_entity(user_preferences::Entity),
		schema.create_table_from_entity(library::Entity),
		schema.create_table_from_entity(reading_session::Entity),
		schema.create_table_from_entity(finished_reading_session::Entity),
		schema.create_table_from_entity(registered_reading_device::Entity),
	];

	for stmt in tables {
		db.execute(db.get_database_backend().build(&stmt)).await?;
	}

	Ok(())
}
