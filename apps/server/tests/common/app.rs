use std::sync::Arc;

use axum_test::TestServer;
use serde_json::{json, Value};
use stump_core::{Ctx, StumpCore};
use stump_server::config::session::get_session_layer;
use stump_server::routers;
use tests::db::test_database;

/// a running test instance of the stump server that will contain:
/// - in-memory database
/// - initialized server (e.g. config, jwt secrets, etc)
pub struct TestApp {
	pub server: TestServer,
}

impl TestApp {
	pub async fn new() -> Self {
		let db = test_database().await;

		let ctx = Ctx::for_testing(db);
		let core = StumpCore::from_ctx(ctx);

		core.init_server_config()
			.await
			.expect("failed to init server config");
		core.init_jwt_secrets()
			.await
			.expect("failed to init jwt secrets");

		// todo: ^ prob need to add more of the init_ calls as needed

		let app_state = Arc::new(core.get_context());

		let router = routers::mount(app_state.clone())
			.await
			.with_state(app_state.clone())
			.layer(get_session_layer(app_state));

		let server = TestServer::new(router).expect("failed to create test server");

		Self { server }
	}

	/// create the initial admin account and return an access token
	pub async fn create_initial_account(&self) -> String {
		self.server
			.post("/api/v2/auth/register")
			.json(&json!({ "username": "initial-server-admin", "password": "password" }))
			.await
			.assert_status_ok();

		let login_response = self
			.server
			.post("/api/v2/auth/login?generate_token=true")
			.json(&json!({ "username": "initial-server-admin", "password": "password" }))
			.await;
		login_response.assert_status_ok();
		let login_response: Value = login_response.json();

		login_response["token"]["accessToken"]
			.as_str()
			.expect("access token missing from login response")
			.to_string()
	}
}
