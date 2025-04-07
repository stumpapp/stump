use std::{fs::OpenOptions, io::Write};

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
}

fn main() {
	let config = Config::parse();

	let schema = build_schema_bare();
	let sdl_export_options =
		SDLExportOptions::default().prefer_single_line_descriptions();
	let sdl = schema.sdl_with_options(sdl_export_options);

	let mut file = OpenOptions::new()
		.read(true)
		.write(true)
		.create(true)
		.truncate(true)
		.open(config.path.clone())
		.expect("Unable to open file");
	file.write_all(sdl.as_bytes())
		.expect("Failed to write to file");
	println!("GraphQL schema written to {}", config.path);
}
