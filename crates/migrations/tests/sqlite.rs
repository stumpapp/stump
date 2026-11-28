use migrations::{Migrator, MigratorTrait};
use sea_orm::{
	SqlxSqliteConnector,
	sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions},
};
use std::{env::temp_dir, str::FromStr};
use tokio::fs;

#[tokio::test]
async fn migrations_run_on_sqlite() {
	let dir = temp_dir().join(format!("stump-migrations-test-{}", std::process::id()));
	let _ = fs::remove_dir_all(&dir).await;
	fs::create_dir_all(&dir).await.unwrap();

	let url = format!("sqlite://{}/stump.db?mode=rwc", dir.display());
	let options = SqliteConnectOptions::from_str(&url).expect("valid url");
	let pool = SqlitePoolOptions::new()
		.connect_with(options)
		.await
		.expect("connect");
	let conn = SqlxSqliteConnector::from_sqlx_sqlite_pool(pool);

	Migrator::up(&conn, None)
		.await
		.expect("should have run migrations successfully!");
}
