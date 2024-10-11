mod utils;

use stump_core::StumpCore;
use tempfile::TempDir;

#[tokio::test]
async fn test_create_stump_core() {
	let temp_dir = TempDir::new().unwrap();

	let config_dir = temp_dir.path().to_string_lossy().to_string();
	let config = StumpCore::init_config(config_dir).unwrap();

	let _core = StumpCore::new(config).await;
}

#[tokio::test]
pub async fn test_create_user() {
	let (core, _temp_dir) = utils::get_temp_core().await;
	let ctx = core.get_context();

	// create test user
	let user_result = ctx
		.db
		.user()
		.create("oromei".into(), "1234".into(), vec![])
		.exec()
		.await;

	assert!(
		user_result.is_ok(),
		"Failed to create test user: {:?}",
		user_result
	);
}
