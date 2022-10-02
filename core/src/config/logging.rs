use std::{io, path::PathBuf};

use prisma_client_rust::chrono;
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

pub fn init_fern() -> Result<(), fern::InitError> {
	let mut base_config = fern::Dispatch::new();

	let verbosity = get_log_verbosity();

	let log_file_path = get_log_file();

	base_config = match verbosity {
		// verbosity 0 has a log level of info. Excludes particularly 'loud' crates
		0 => base_config
			.level(log::LevelFilter::Info)
			.level_for("tracing", log::LevelFilter::Off)
			.level_for("quaint", log::LevelFilter::Off)
			.level_for("sql_query_connector", log::LevelFilter::Off)
			.level_for("query_core", log::LevelFilter::Off)
			.level_for("prisma-client-rust", log::LevelFilter::Off)
			.level_for("prisma", log::LevelFilter::Off)
			.level_for("serde_xml_rs", log::LevelFilter::Off),
		// verbosity 1 has a log level of debug. Excludes particularly 'loud' crates
		1 => base_config
			.level(log::LevelFilter::Debug)
			.level_for("tracing", log::LevelFilter::Off)
			.level_for("quaint", log::LevelFilter::Off)
			.level_for("sql_query_connector", log::LevelFilter::Off)
			.level_for("query_core", log::LevelFilter::Off)
			.level_for("prisma-client-rust", log::LevelFilter::Off)
			.level_for("prisma", log::LevelFilter::Off)
			.level_for("hyper", log::LevelFilter::Off)
			.level_for("serde_xml_rs", log::LevelFilter::Off),
		// verbosity 2 has a log level of debug, doesn't exclude *most* of those particularly 'loud' crates
		2 => base_config
			.level(log::LevelFilter::Debug)
			.level_for("hyper", log::LevelFilter::Off)
			.level_for("serde_xml_rs", log::LevelFilter::Off),
		// verbosity 3 has everything except hyper... hyper is just SO LOUD
		_3_or_more => base_config
			.level(log::LevelFilter::Trace)
			.level_for("hyper", log::LevelFilter::Off),
	};

	// Separate file config so we can include year, month and day in file logs
	let file_config = fern::Dispatch::new()
		.format(|out, message, record| {
			out.finish(format_args!(
				"{}[{}][{}] {}",
				chrono::Local::now().format("[%Y-%m-%d][%H:%M:%S]"),
				record.target(),
				record.level(),
				message
			))
		})
		.chain(fern::log_file(
			&log_file_path.to_string_lossy().to_string(),
		)?);

	let stdout_config = fern::Dispatch::new()
		.format(|out, message, record| {
			// special format for debug messages coming from our own crate.
			// TODO: change this
			if record.level() > log::LevelFilter::Info && record.target() == "cmd_program"
			{
				out.finish(format_args!(
					"---\nDEBUG: {}: {}\n---",
					chrono::Local::now().format("%H:%M:%S"),
					message
				))
			} else {
				out.finish(format_args!(
					"[{}][{}][{}] {}",
					chrono::Local::now().format("%H:%M"),
					record.target(),
					record.level(),
					message
				))
			}
		})
		.chain(io::stdout());

	base_config
		.chain(file_config)
		.chain(stdout_config)
		.apply()?;

	Ok(())
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

	// let l0 = tracing_subscriber::fmt::layer();

	// let layer = tracing_subscriber::fmt::layer().with_ansi(false);

	// tracing_subscriber::registry()
	// 	.with(l0)
	// 	.with(layer)
	// 	.try_init()
	// 	.unwrap();

	tracing_subscriber::registry()
		// .with(tracing_subscriber::fmt().with_max_level(max_level))
		.with(max_level)
		.with(
			EnvFilter::from_default_env()
				.add_directive(
					"stump_core=trace"
						.parse()
						.expect("Error invalid tracing directive!"),
				)
				.add_directive(
					"stump_server_axum=trace"
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
