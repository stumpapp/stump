use std::{path::PathBuf, str::FromStr};

use clap::Subcommand;
use dialoguer::{Confirm, Input};
use sea_orm::{ConnectionTrait, DatabaseBackend, Statement};
use stump_core::{
	config::StumpConfig,
	database::{connect, JournalMode},
};

use super::default_progress_spinner;
use crate::{error::CliResult, CliError};

/// Subcommands for interacting with the system commands
#[derive(Subcommand, Debug)]
pub enum System {
	/// Set the journal mode for the database. Please use this command with caution!
	SetJournalMode {
		/// The journal mode to set
		#[clap(long)]
		mode: JournalMode,
	},
	SeaOrmMigration,
}

pub async fn handle_system_command(
	command: System,
	config: &StumpConfig,
) -> CliResult<()> {
	match command {
		System::SetJournalMode { mode } => set_journal_mode(mode, config).await,
		System::SeaOrmMigration => backfill_prisma_to_seaorm(config).await,
	}
}

async fn set_journal_mode(mode: JournalMode, config: &StumpConfig) -> CliResult<()> {
	let confirmation = Confirm::new()
    .with_prompt("Changing the journal mode can lead to unexpected behavior. Are you sure you want to continue?")
    .interact()?;

	if !confirmation {
		println!("Exiting...");
		return Ok(());
	}

	let progress = default_progress_spinner();
	progress.set_message("Connecting to database...");

	let conn = connect(config).await?;

	progress.set_message("Fetching current journal mode...");

	let journal_mode = match conn
		.query_one(Statement::from_string(
			DatabaseBackend::Sqlite,
			"PRAGMA journal_mode;",
		))
		.await?
	{
		Some(result) => {
			let raw = result.try_get::<String>("", "journal_mode")?;
			JournalMode::from_str(&raw).map_err(|e| {
				CliError::Unknown(format!("Failed to parse journal mode: {}", e))
			})?
		},
		None => JournalMode::default(),
	};

	if journal_mode == mode {
		progress.finish_with_message("Journal mode already set to desired value");
		return Ok(());
	}

	progress.set_message("Updating journal mode...");
	let _result = conn
		.execute_unprepared(&format!("PRAGMA journal_mode={};", mode.as_ref()))
		.await?;

	progress.finish_with_message("Journal mode successfully set");

	Ok(())
}

async fn backfill_prisma_to_seaorm(config: &StumpConfig) -> CliResult<()> {
	let did_run_migrations = Confirm::new()
		.with_prompt("You must run Stump after migrating to SeaORM to generate a new database. Have you done this?")
		.interact()?;

	if !did_run_migrations {
		println!("Exiting...");
		return Ok(());
	}

	let backfill_script = Input::new()
		.with_prompt("Enter the path to the backfill.sql file")
		.allow_empty(false)
		.validate_with(|input: &String| -> Result<(), &str> {
			let path_buf = PathBuf::from(input);
			if !path_buf.exists() {
				Err("The specified file does not exist")
			} else if path_buf.extension().is_some_and(|ext| ext != "sql") {
				Err("The specified file is not a valid SQL file")
			} else {
				Ok(())
			}
		})
		.interact_text()?;

	let legacy_db = Input::new()
		.with_prompt("Enter the path to the legacy database file (i.e. the one with the data you want to migrate)")
		.allow_empty(false)
		.validate_with(|input: &String| -> Result<(), &str> {
			let path_buf = PathBuf::from(input);
			if !path_buf.exists() {
				Err("The specified file does not exist")
			} else if path_buf
				.extension()
				.is_some_and(|ext| ext != "db" && ext != "sqlite")
			{
				Err("The specified file is not a valid database file")
			} else {
				Ok(())
			}
		})
		.interact_text()?;

	let database_path = config
		.db_path
		.as_ref()
		.map(PathBuf::from)
		.unwrap_or_else(|| PathBuf::from(&config.config_dir).join("stump.db"));

	let confirmation = Confirm::new()
		.with_prompt(format!(
			"Are you sure you want to run the backfill script on {}? This will overwrite existing data.",
			database_path.display()
		))
		.interact()?;

	if !confirmation {
		println!("Exiting...");
		return Ok(());
	}

	if !database_path.exists() {
		return Err(CliError::Unknown(format!(
			"Database file does not exist at {}",
			database_path.display()
		)));
	}

	// Load the script as string, replace the following:
	// /replace/with/full/path/to/stump-before-migration.db -> {backup_db}

	let script = std::fs::read_to_string(backfill_script)
		.map_err(|e| CliError::Unknown(format!("Failed to read backfill script: {}", e)))?
		.replace(
			"/replace/with/full/path/to/stump-before-migration.db",
			&legacy_db,
		);

	let conn = connect(config).await?;

	let progress = default_progress_spinner();
	progress.set_message("Running backfill script...");

	let _result = conn.execute_unprepared(&script).await.map_err(|e| {
		CliError::Unknown(format!("Failed to execute backfill script: {}", e))
	})?;

	progress.finish_with_message("Backfill script executed successfully");

	Ok(())
}
