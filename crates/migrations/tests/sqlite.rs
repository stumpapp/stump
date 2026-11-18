use migrations::{Migrator, MigratorTrait};
use sea_orm::Database;
use std::env::temp_dir;
use tokio::fs;

#[tokio::test]
async fn migrations_run_on_sqlite() {
	let dir = temp_dir().join(format!("stump-migrations-test-{}", std::process::id()));
	let _ = fs::remove_dir_all(&dir).await;
	fs::create_dir_all(&dir).await.unwrap();

	let url = format!("sqlite://{}/stump.db?mode=rwc", dir.display());
	let conn = Database::connect(&url).await.expect("connect");

	Migrator::up(&conn, None)
		.await
		.expect("should have run migrations successfully!");
}
