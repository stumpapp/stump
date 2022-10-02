use std::path::PathBuf;

use tracing_subscriber::{
	filter::LevelFilter, fmt::writer::MakeWriterExt,
	prelude::__tracing_subscriber_SubscriberExt, util::SubscriberInitExt, EnvFilter,
};

use super::get_config_dir;

pub const STUMP_SHADOW_TEXT: &str = include_str!("stump_shadow_text.txt");

pub fn get_log_file() -> PathBuf {
	get_config_dir().join("Stump.log")
}
// TODO: change default back to 0
// FIXME: use toml
pub fn get_log_verbosity() -> u64 {
	match std::env::var("STUMP_LOG_VERBOSITY") {
		Ok(s) => s.parse::<u64>().unwrap_or(3),
		Err(_) => 3,
	}
}

pub fn init_tracing() {
	let config_dir = get_config_dir();

	let file_appender = tracing_appender::rolling::never(&config_dir, "Stump.log");

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
		.with(
			tracing_subscriber::fmt::layer()
				.pretty()
				.with_ansi(true)
				// TODO: maybe separate file appender and stdout as separate layers to
				// remove ansi from file appender
				.with_writer(file_appender.and(std::io::stdout)),
		)
		.init();

	tracing::debug!("Tracing initialized with verbosity {}", verbosity);
}
