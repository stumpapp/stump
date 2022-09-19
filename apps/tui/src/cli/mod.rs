use clap::{Parser, Subcommand};

use crate::{error::CliError, event::CliEvent};

pub mod config;

#[derive(Parser, Debug)]
#[clap(author, version, about, long_about = None)]
#[clap(propagate_version = true)]
struct Cli {
	#[clap(subcommand)]
	command: Option<Commands>,
}

#[derive(Subcommand, Debug)]
enum Commands {
	/// Configures the CLI to connect to the Stump server
	Config {
		base_url: Option<String>,
		username: Option<String>,
		password: Option<String>,
	},
}

pub async fn parse_and_run() -> Result<CliEvent, CliError> {
	let args = Cli::parse();
	match args.command {
		Some(Commands::Config {
			base_url,
			username,
			password,
		}) => {
			config::run_command(base_url, username, password).await?;
		},
		None => {
			// When no subcommand is provided, launch the TUI
			return Ok(CliEvent::StartTui);
		},
	};

	// If we get here, we've successfully run a command. We should exit the CLI.
	Ok(CliEvent::GracefulShutdown(Some(
		"Command completed".to_string(),
	)))
}
