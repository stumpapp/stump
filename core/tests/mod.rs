use std::sync::Once;

use futures::executor::block_on;

// https://web.mit.edu/rust-lang_v1.25/arch/amd64_ubuntu1404/share/doc/rust/html/book/second-edition/ch11-03-test-organization.html
// TODO: split core into apps/server and core, where core is a library. I can't even write integration tests
// without doing this. I wanted to wait a little longer, since this is also a requirement for writing the TUI
// utility (which is not priority), but oh well. Might as well get it over with.

// TODO: do I need this? Probably...
static INIT: Once = Once::new();

pub fn initialize() {
	INIT.call_once(|| {
		block_on(async {
			// remove existing test database
			if let Err(err) = std::fs::remove_file("integration_tests.db") {
				// If the file doesn't exist, that's fine, but if it does exist and we can't
				// remove it, that's a problem.
				if err.kind() != std::io::ErrorKind::NotFound {
					panic!("Failed to remove existing test database: {}", err);
				}
			}

			// initialize prisma (create database)
			// let client = db::create_client_with_url("file:integration_tests.db").await;

			// push prisma schema
			// client._db_push().await.expect("Failed to push database schema");

			// create test user
			// let user = client.user().create(...).await.expect("Failed to create test user");
		});
	});
}
