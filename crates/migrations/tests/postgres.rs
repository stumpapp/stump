#![cfg(feature = "postgres-tests")]
// ^ just comment out to develop i am l a z y
// if you see this please remember to uncomment it
// before committing anything

use migrations::{Migrator, MigratorTrait};
use sea_orm::Database;
use testcontainers::runners::AsyncRunner;
use testcontainers_modules::postgres::Postgres;

#[tokio::test]
async fn migrations_run_on_postgres() {
	let container = Postgres::default()
		.start()
		.await
		.expect("should have started postgres container");

	let url = format!(
		"postgres://postgres:postgres@{}:{}/postgres",
		container.get_host().await.expect("should have a host"),
		container
			.get_host_port_ipv4(5432)
			.await
			.expect("should have a host port")
	);

	let conn = Database::connect(&url)
		.await
		.expect("should have connected to postgres");

	Migrator::up(&conn, None)
		.await
		.expect("should have run migrations successfully!");
}
