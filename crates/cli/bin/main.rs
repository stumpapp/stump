use cli::{handle_command, Cli, Parser};
use stump_core::{config, StumpCore};

/// This is just an example of how to use this crate. It is going to be used in the
/// server app. This is not meant to be a real CLI binary.
#[tokio::main]
async fn main() {
	let app = Cli::parse();

	let config_dir = config::bootstrap_config_dir();
	let stump_config = StumpCore::init_config(config_dir)
		.expect("Failed to initialize stump configuration");

	if let Some(command) = app.command {
		handle_command(command, &app.config.merge_stump_config(stump_config))
			.await
			.expect("Failed to handle command");
	} else {
		println!("No command provided! This would start the server IRL");
	}
}
