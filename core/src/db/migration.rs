use tracing::{debug, info};

use crate::{error::CoreResult, prisma, CoreError};

pub async fn run_migrations(client: &prisma::PrismaClient) -> CoreResult<()> {
	info!("Running migrations...");

	#[cfg(debug_assertions)]
	{
		let mut builder = client._db_push();

		if std::env::var("FORCE_RESET_DB")
			.map(|v| v == "true")
			.unwrap_or(false)
		{
			debug!("Forcing database reset...");
			builder = builder.force_reset();
		}

		debug!("Committing database push...");
		builder
			.await
			.map_err(|e| CoreError::MigrationError(e.to_string()))?;

		info!("Migrations complete!");
	}

	#[cfg(not(debug_assertions))]
	client
		._migrate_deploy()
		.await
		.map_err(|e| CoreError::MigrationError(e.to_string()))?;

	Ok(())
}
