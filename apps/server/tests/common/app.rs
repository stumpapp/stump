use std::sync::Arc;

use axum_test::{TestResponse, TestServer};
use sea_orm::DatabaseConnection;
use serde_json::{json, Value};
use stump_core::{Ctx, StumpCore};
use stump_server::config::session::get_session_layer;
use stump_server::routers;
use tests::db::test_database;
use tokio::sync::RwLock;

/// a running test instance of the stump server that will contain:
/// - in-memory database
/// - initialized server (e.g. config, jwt secrets, etc)
pub struct TestApp {
	pub server: TestServer,
	pub ctx: Arc<Ctx>,
	pub access_token: RwLock<Option<String>>,
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
			.layer(get_session_layer(app_state.clone()));

		let mut server = TestServer::new(router).expect("failed to create test server");
		server.add_header("user-agent", "stump-server-tests"); // all requests fails without this

		Self {
			server,
			ctx: app_state,
			access_token: RwLock::new(None),
		}
	}

	/// creates a new instance of [TestApp] and also creates the initial admin user, setting the access token for the app
	/// to be used in consecutive requests
	pub async fn new_with_default_user() -> Self {
		let app = Self::new().await;
		let token = app.create_initial_account().await;
		*app.access_token.write().await = Some(token);
		app
	}

	pub fn conn(&self) -> &DatabaseConnection {
		self.ctx.conn.as_ref()
	}

	async fn auth_header(&self) -> String {
		format!(
			"Bearer {}",
			self.access_token
				.read()
				.await
				.clone()
				.unwrap_or_else(|| String::from("no-token-set"))
		)
	}

	pub async fn execute_gql(&self, query: &str, variables: Option<Value>) -> Value {
		let mut body = json!({ "query": query });
		if let Some(vars) = variables {
			body["variables"] = vars;
		}

		let response = self
			.server
			.post("/api/graphql")
			.add_header("Authorization", self.auth_header().await)
			.json(&body)
			.await;
		response.assert_status_ok();

		response.json()
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

		login_response["accessToken"]
			.as_str()
			.expect("access token missing from login response")
			.to_string()
	}

	/// issue a GET request to the specified path with auth headers, returning the response directly
	pub async fn get(&self, path: &str) -> TestResponse {
		let response = self
			.server
			.get(path)
			.add_header("Authorization", self.auth_header().await)
			.await;

		response
	}

	/// issue a PUT request to the specified path with auth headers and a JSON body, returning the response directly
	pub async fn put(&self, path: &str, body: &Value) -> TestResponse {
		let response = self
			.server
			.put(path)
			.add_header("Authorization", self.auth_header().await)
			.json(body)
			.await;

		response
	}
}
