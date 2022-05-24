pub mod migration;

use std::path::PathBuf;

use crate::prisma;

/// Creates the Stump data directory relative to the home directory of the host
/// OS. If the directory does not exist, it will be created.
fn create_config_dir() -> String {
	let db_path = match std::env::var("STUMP_CONFIG_DIR") {
		Ok(path) => PathBuf::from(&path),
		// .join("stump.db"),
		_ => dirs::home_dir()
			.expect("Failed to get data dir")
			.join(".stump"), // .join("stump.db"),
	};

	let path_str = db_path.to_str().unwrap();

	std::fs::create_dir_all(&path_str).unwrap();

	path_str.to_string()
}

/// Creates the PrismaClient. Will call `create_data_dir` as well
pub async fn create_client() -> prisma::PrismaClient {
	let rocket_env =
		std::env::var("ROCKET_PROFILE").unwrap_or_else(|_| "debug".to_string());

	// FIXME: This is NOT working on builds, I can pass the ROCKET_PROFILE=release
	// manually when running the binary, and when I set ROCKET_LOG_LEVEL=debug I can
	// see Rocket knows it is release.
	if rocket_env == "release" {
		let config_dir = create_config_dir();

		prisma::new_client_with_url(&format!("file:{}/stump.db", &config_dir))
			.await
			.expect("Failed to create Prisma client")
	} else {
		println!("{:?}", std::env::var("ROCKET_PROFILE"));
		// Development database will live in the /prisma directory
		prisma::new_client()
			.await
			.expect("Failed to create Prisma client")
	}
}
