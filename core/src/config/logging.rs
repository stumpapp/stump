use tracing_subscriber::{
	filter::LevelFilter, prelude::__tracing_subscriber_SubscriberExt,
	util::SubscriberInitExt, EnvFilter,
};

use super::StumpConfig;

pub const STUMP_SHADOW_TEXT: &str = include_str!("stump_shadow_text.txt");

/// Initializes the logging system, which uses the [tracing] crate. Logs are written to
/// both the console and a file in the config directory. The file is called `Stump.log`
/// by default.
pub fn init_tracing(config: &StumpConfig) {
	let config_dir = config.get_config_dir();
	let file_appender = tracing_appender::rolling::never(config_dir, "Stump.log");

	let max_level = match config.verbosity {
		0 => LevelFilter::OFF,
		1 => LevelFilter::INFO,
		2 => LevelFilter::DEBUG,
		_3_or_more => LevelFilter::TRACE,
	};

	let mut env_filter = EnvFilter::from_default_env()
		.add_directive(
			"stump_core=trace"
				.parse()
				.expect("Error invalid tracing directive for stump_core!"),
		)
		.add_directive(
			"stump_server=trace"
				.parse()
				.expect("Error invalid tracing directive for stump_server!"),
		)
		.add_directive(
			"tower_http=debug"
				.parse()
				.expect("Error invalid tracing directive for tower_http!"),
		);

	if config.verbosity > 2 {
		env_filter = env_filter
			.add_directive(
				"quaint::connector::metrics=debug"
					.parse()
					.expect("Failed to parse tracing directive for quaint!"),
			)
			.add_directive(
				"sqlx::query=debug"
					.parse()
					.expect("Failed to parse tracing directive for sqlx!"),
			);
	}

	if cfg!(debug_assertions) {
		env_filter = env_filter.add_directive(
			"sea_orm::driver::sqlx_sqlite=debug"
				.parse()
				.expect("Failed to parse tracing directive for sea_orm!"),
		)
	}

	let base_layer = tracing_subscriber::registry()
		.with(max_level)
		.with(env_filter);

	// TODO: This is likely unnecessary duplication(?), and should be revisited
	if config.pretty_logs {
		base_layer
			.with(
				tracing_subscriber::fmt::layer()
					.pretty()
					.with_ansi(true)
					.with_writer(std::io::stdout),
			)
			.with(
				tracing_subscriber::fmt::layer()
					.pretty()
					// We don't want to use ANSI codes in the file
					.with_ansi(false)
					.with_writer(file_appender),
			)
			.init();
	} else {
		base_layer
			.with(
				tracing_subscriber::fmt::layer()
					.with_ansi(true)
					.with_writer(std::io::stdout),
			)
			.with(
				tracing_subscriber::fmt::layer()
					// We don't want to use ANSI codes in the file
					.with_ansi(false)
					.with_writer(file_appender),
			)
			.init();
	};

	tracing::info!(verbosity = ?max_level, verbosity_num = config.verbosity, "Tracing initialized");
}
