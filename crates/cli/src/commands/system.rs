use clap::Subcommand;
use dialoguer::Confirm;
use stump_core::{
	config::StumpConfig,
	db::{create_client, DBPragma, JournalMode},
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
}

pub async fn handle_system_command(
	command: System,
	config: &StumpConfig,
) -> CliResult<()> {
	match command {
		System::SetJournalMode { mode } => set_journal_mode(mode, config).await,
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

	let client = create_client(config).await;

	progress.set_message("Fetching current journal mode...");
	let current_journal_mode = client.get_journal_mode().await?;

	if current_journal_mode == mode {
		progress.finish_with_message("Journal mode already set to desired value");
		return Ok(());
	}

	progress.set_message("Updating journal mode...");
	let new_journal_mode = client.set_journal_mode(mode).await?;

	if new_journal_mode != mode {
		progress.finish_with_message("Journal mode failed to be set");
		return Err(CliError::OperationFailed(
			"Journal mode failed to be set".to_string(),
		));
	}

	progress.finish_with_message("Journal mode successfully set");

	Ok(())
}
