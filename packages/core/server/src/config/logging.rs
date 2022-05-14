// extern crate log;

use std::io::Write;

pub fn init() {
	// let mut builder = env_logger::Builder::new();

	// let verbosity = match std::env::var("STUMP_LOG_LEVEL") {
	// 	Ok(verbosity) => match verbosity.to_lowercase().as_str() {
	// 		"verbose" => "VERBOSE",
	// 		"internal" => "INTERNAL",
	// 		"none" => "NONE",
	// 		_ => "INTERNAL",
	// 	},
	// 	Err(_) => "INTERNAL",
	// };

	// match verbosity {
	// 	"INTERNAL" => {
	// 		builder
	// 			.filter_level(log::LevelFilter::Info)
	// 			.filter_module("tracing", log::LevelFilter::Off)
	// 			.filter_module("quaint", log::LevelFilter::Off)
	// 			.filter_module("sql_query_connector", log::LevelFilter::Off)
	// 			.filter_module("query_core", log::LevelFilter::Off)
	// 			.filter_module("prisma-client-rust", log::LevelFilter::Off)
	// 			.filter_module("prisma", log::LevelFilter::Off);
	// 	},
	// 	"VERBOSE" => {
	// 		builder.filter_level(log::LevelFilter::Info);
	// 	},
	// 	"NONE" => {
	// 		builder.filter_level(log::LevelFilter::Off);
	// 	},
	// 	_ => {
	// 		builder.filter_level(log::LevelFilter::Info);
	// 	},
	// };

	// if verbosity != "NONE" {
	// 	builder.format(|buf, record| {
	// 		let style = buf.style();
	// 		// style.set_bg(Color::Yellow).set_bold(true);
	// 		// let timestamp = buf.timestamp();
	// 		writeln!(buf, ">> {}", style.value(record.args()))
	// 	});
	// }

	// builder.init();

	// env_logger::init();
}
