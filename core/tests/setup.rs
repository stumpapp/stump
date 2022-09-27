extern crate stump_core;

use std::{path::PathBuf, sync::Once};

use stump_core::{config::Ctx, db::migration::run_migrations};

// https://web.mit.edu/rust-lang_v1.25/arch/amd64_ubuntu1404/share/doc/rust/html/book/second-edition/ch11-03-test-organization.html

static INIT: Once = Once::new();

pub async fn initialize() {
	if INIT.is_completed() {
		return;
	}

	// remove existing test database
	if let Err(err) = std::fs::remove_file("test.db") {
		// If the file doesn't exist, that's fine, but if it does exist and we can't
		// remove it, that's a problem.
		if err.kind() != std::io::ErrorKind::NotFound {
			panic!("Failed to remove existing test database: {}", err);
		}
	}

	let test_ctx = Ctx::mock().await;

	let client = test_ctx.get_db();

	println!("Running migrations...");
	// TODO: once migration engine is built into pcr, replace with commented out code below
	// client._db_push().await.expect("Failed to push database schema");
	let migration_result = run_migrations(&client).await;

	assert!(
		migration_result.is_ok(),
		"Failed to run migrations: {:?}",
		migration_result
	);
	println!("Migrations completed.");

	// create test user
	let user_result = client
		.user()
		.create("oromei".into(), "1234".into(), vec![])
		.exec()
		.await;

	assert!(
		user_result.is_ok(),
		"Failed to create test user: {:?}",
		user_result
	);
	println!("Created test user");

	INIT.call_once(|| {});
	println!("Initializing of test database completed.");
}

pub fn get_test_data_dir() -> PathBuf {
	PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/data")
}
