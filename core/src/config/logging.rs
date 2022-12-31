use std::path::PathBuf;

use tracing_subscriber::{
	filter::LevelFilter, prelude::__tracing_subscriber_SubscriberExt,
	util::SubscriberInitExt, EnvFilter,
};

use super::get_config_dir;

pub const STUMP_SHADOW_TEXT: &str = include_str!("stump_shadow_text.txt");

pub fn get_log_file() -> PathBuf {
	get_config_dir().join("Stump.log")
}
pub fn get_log_verbosity() -> u64 {
	match std::env::var("STUMP_VERBOSITY") {
		Ok(s) => s.parse::<u64>().unwrap_or(1),
		Err(_) => 1,
	}
}

/// Initializes the logging system, which uses the [tracing] crate. Logs are written to
/// both the console and a file in the config directory. The file is called `Stump.log`
/// by default.
pub fn init_tracing() {
	let config_dir = get_config_dir();

	let file_appender = tracing_appender::rolling::never(config_dir, "Stump.log");

	let verbosity = get_log_verbosity();
	let max_level = match verbosity {
		0 => LevelFilter::OFF,
		1 => LevelFilter::INFO,
		2 => LevelFilter::DEBUG,
		_3_or_more => LevelFilter::TRACE,
	};

	tracing_subscriber::registry()
		.with(max_level)
		.with(
			EnvFilter::from_default_env()
				.add_directive(
					"stump_core=trace"
						.parse()
						.expect("Error invalid tracing directive!"),
				)
				.add_directive(
					"stump_server=trace"
						.parse()
						.expect("Error invalid tracing directive!"),
				),
		)
		// Note: I have two layers here, separating the file appender and the stdout.
		// I've done this, rather than merging them, becuase I don't want the ansi
		// characters in the file appender.
		.with(
			tracing_subscriber::fmt::layer()
				.pretty()
				.with_ansi(true)
				.with_writer(std::io::stdout),
		)
		.with(
			tracing_subscriber::fmt::layer()
				.pretty()
				.with_ansi(false)
				.with_writer(file_appender),
		)
		.init();

	tracing::debug!("Tracing initialized with verbosity {}", verbosity);
}
