use tempfile::TempDir;

use stump_core::StumpCore;

pub async fn get_temp_core() -> (StumpCore, TempDir) {
	let temp_dir = TempDir::new().unwrap();

	let config_dir = temp_dir.path().to_string_lossy().to_string();
	let config = StumpCore::init_config(config_dir).unwrap();
	let core = StumpCore::new(config).await;

	let migration_res = core.run_migrations().await;
	assert!(
		migration_res.is_ok(),
		"Failed to run migrations: {:?}",
		migration_res
	);

	let job_init_res = core.get_job_controller().initialize().await;
	assert!(
		job_init_res.is_ok(),
		"Failed to initialize job controller: {:?}",
		job_init_res
	);

	// Initialize the server configuration. If it already exists, nothing will happen.
	let init_config_res = core.init_server_config().await;
	assert!(
		init_config_res.is_ok(),
		"Failed to initialize server config: {:?}",
		init_config_res
	);

	// Initialize the encryption key, if it doesn't exist
	let init_encryption_res = core.init_encryption().await;
	assert!(
		init_encryption_res.is_ok(),
		"Failed to initialize encryption: {:?}",
		init_encryption_res
	);

	let init_journal_res = core.init_journal_mode().await;
	assert!(
		init_journal_res.is_ok(),
		"Failed to initialize journal mode: {:?}",
		init_journal_res
	);

	// Initialize the scheduler
	let scheduler_res = core.init_scheduler().await;
	assert!(
		scheduler_res.is_ok(),
		"Failed to initialize scheduler: {:?}",
		scheduler_res
	);

	(core, temp_dir)
}
