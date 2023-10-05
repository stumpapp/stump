mod commands;
mod config;
mod error;

pub use commands::{handle_command, Commands};
pub use config::CliConfig;
pub use error::CliError;

pub use clap::Parser;

/// A CLI for Stump. If no subcommand is provided, the server will be started.
#[derive(Parser)]
#[command(name = "stump")]
#[command(author, version, about, long_about = None)]
pub struct Cli {
	#[clap(flatten)]
	pub config: CliConfig,

	/// The available subcommands. If no subcommand is provided, the server will be started
	#[command(subcommand)]
	pub command: Option<Commands>,
}

// # start the server
// $ ./server

// # unlock an account
// $ ./server account lock --username <username>

// # freeze an account
// $ ./server account unlock --username <username>

// # list all frozen accounts
// $ ./server account list --locked

// # reset password for a user
// $ ./server account reset-password --username <username>
