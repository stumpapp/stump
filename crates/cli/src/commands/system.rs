use std::str::FromStr;

use clap::Subcommand;
use dialoguer::Confirm;
use models::entity::{refresh_token, server_config};
use sea_orm::{prelude::*, ConnectionTrait, DatabaseBackend, Statement};
use stump_core::{
	config::StumpConfig,
	database::{connect, JournalMode},
	utils::encryption,
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
	/// rotate the secrets used to sign jwt tokens, which will invalidate all existing tokens
	RotateJwtSecrets,
}

pub async fn handle_system_command(
	command: System,
	config: &StumpConfig,
) -> CliResult<()> {
	match command {
		System::SetJournalMode { mode } => set_journal_mode(mode, config).await,
		System::RotateJwtSecrets => rotate_jwt_secrets(config).await,
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

async fn rotate_jwt_secrets(config: &StumpConfig) -> CliResult<()> {
	let confirmation = Confirm::new()
        .with_prompt("Rotating JWT secrets will invalidate all existing tokens. Are you sure you want to continue?")
        .interact()?;

	if !confirmation {
		println!("Exiting...");
		return Ok(());
	}

	let progress = default_progress_spinner();

	let conn = connect(config).await?;

	progress.set_message("Rotating JWT secrets...");

	let jwt_access_secret = encryption::create_encryption_key()?;
	let jwt_refresh_secret = encryption::create_encryption_key()?;
	let _ = server_config::Entity::update_many()
		.col_expr(
			server_config::Column::JwtAccessSecret,
			Expr::value(Some(jwt_access_secret)),
		)
		.col_expr(
			server_config::Column::JwtRefreshSecret,
			Expr::value(Some(jwt_refresh_secret)),
		)
		.exec(&conn)
		.await?;

	progress.set_message("Deleting all existing refresh tokens...");

	refresh_token::Entity::delete_many().exec(&conn).await?;

	progress.finish_with_message("JWT secrets successfully rotated!");

	Ok(())
}
