use std::{
	fs::{self, OpenOptions},
	io::Write,
};

use async_graphql::SDLExportOptions;
use clap::Parser;
use graphql::schema::build_schema_bare;

/// Generate the GraphQL schema for Stump clients
#[derive(Parser, Debug, Clone)]
#[clap(name = "graphql_schema_gen")]
#[clap(about = "Generate the GraphQL schema for Stump clients")]
struct Config {
	/// Write the schema to a specified file
	#[clap(long, default_value = "./crates/graphql/schema.graphql")]
	path: String,

	#[clap(long, default_value = "false")]
	check: bool,
}

fn get_schema_string() -> String {
	let schema = build_schema_bare();
	let sdl_export_options =
		SDLExportOptions::default().prefer_single_line_descriptions();
	schema.sdl_with_options(sdl_export_options)
}

fn check_schema(path: &str, sdl: &str) {
	let contents = fs::read_to_string(path).expect("Unable to read file");
	if contents != sdl {
		panic!("\n\x1b[93mSchema mismatch! Please run 'cargo dump-schema' to update the schema.\n\x1b[0m");
	}
}

fn write_schema(path: &str, sdl: &str) {
	let mut file = OpenOptions::new()
		.read(true)
		.write(true)
		.create(true)
		.truncate(true)
		.open(path)
		.expect("Unable to open file");

	file.write_all(sdl.as_bytes())
		.expect("Failed to write to file");

	println!("GraphQL schema written to {}", path);
}

fn main() {
	let config = Config::parse();
	let sdl = get_schema_string();

	if config.check {
		check_schema(&config.path, &sdl);
	} else {
		write_schema(&config.path, &sdl)
	}
}
