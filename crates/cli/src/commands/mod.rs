mod account;
mod system;

use std::time::Duration;

use clap::Subcommand;
use indicatif::{ProgressBar, ProgressStyle};
use stump_core::config::StumpConfig;

use crate::error::CliResult;

use self::{account::Account, system::System};

#[derive(Subcommand, Debug)]
pub enum Commands {
	#[command(subcommand)]
	Account(Account),
	#[command(subcommand)]
	System(System),
}

pub async fn handle_command(command: Commands, config: &StumpConfig) -> CliResult<()> {
	match command {
		Commands::Account(account) => {
			account::handle_account_command(account, config).await
		},
		Commands::System(system) => system::handle_system_command(system, config).await,
	}
}

pub(crate) fn default_progress_spinner() -> ProgressBar {
	let progress = ProgressBar::new_spinner();
	progress.enable_steady_tick(Duration::from_millis(120));
	progress.set_style(
		ProgressStyle::with_template("{spinner} {msg}")
			.unwrap()
			.tick_strings(&["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]),
	);
	progress
}
