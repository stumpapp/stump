mod common;
mod reading_progress;

use common::TestApp;

// TODO(testing): prob split into separate folders for groups, e.g. auth/ opds/ etc

/// server should start, the first user can register and login successfully
#[tokio::test]
async fn test_server_boots_and_auth_works() {
	let app = TestApp::new().await;
	let token = app.create_initial_account().await;
	assert!(!token.is_empty(), "expected a non-empty access token");
}
