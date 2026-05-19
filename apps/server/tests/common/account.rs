use graphql::input::user::CreateUserInput;

#[derive(Debug, Clone)]
pub struct TestAccount {
	username: &'static str,
	password: &'static str,
	// role: TestAccountRole,
	// age_restriction: Option<i32>,
	// ^ etc etc etc in the future
}

// pub enum TestAccountRole {
// 	ServerAdmin,
// 	// Custom(vec<permissions>)
// 	// Child, etc
// }

// impl TestAccount {
// 	pub async fn register(&self, app: &TestApp) {
// 		// app.server
// 		// 	.grapqhl(CreateUserInput)
// 	}
// }

impl From<TestAccount> for CreateUserInput {
	fn from(account: TestAccount) -> Self {
		CreateUserInput {
			username: account.username.to_string(),
			password: account.password.to_string(),
			age_restriction: None,
			// permissions: match account.role {
			// 	TestAccountRole::ServerAdmin =>
			// },
			permissions: vec![],
			max_sessions_allowed: None,
		}
	}
}

// pub const TEST_ACCOUNTS: [TestAccount; 1] = [TestAccount {
// 	username: "initial-server-admin",
// 	password: "password",
// 	// role: TestAccountRole::ServerAdmin,
// }];
