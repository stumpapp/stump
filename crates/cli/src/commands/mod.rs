mod account;

use std::time::Duration;

use clap::Subcommand;
use indicatif::{ProgressBar, ProgressStyle};

use crate::{error::CliResult, CliConfig};

use self::account::Account;

#[derive(Subcommand, Debug)]
pub enum Commands {
	#[command(subcommand)]
	Account(Account),
}

pub async fn handle_command(command: Commands, config: CliConfig) -> CliResult<()> {
	match command {
		Commands::Account(account) => {
			account::handle_account_command(account, config).await
		},
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

pub(crate) fn chain_optional_iter<T>(
	required: impl IntoIterator<Item = T>,
	optional: impl IntoIterator<Item = Option<T>>,
) -> Vec<T> {
	required
		.into_iter()
		.map(Some)
		.chain(optional)
		.flatten()
		.collect()
}
