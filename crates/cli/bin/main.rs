use cli::{handle_command, Cli, Parser};
use stump_core::StumpCore;

/// This is just an example of how to use this crate. It is going to be used in the
/// server app. This is not meant to be a real CLI binary.
#[tokio::main]
async fn main() {
	let app = Cli::parse();

	let environment_load_result = StumpCore::init_environment();
	if let Err(err) = environment_load_result {
		println!("Failed to load environment variables: {:?}", err);
	}

	if let Some(command) = app.command {
		handle_command(command, app.config)
			.await
			.expect("Failed to handle command");
	} else {
		println!("No command provided! This would start the server IRL");
	}
}
