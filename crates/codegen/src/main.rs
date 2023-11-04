use std::{error::Error, path::PathBuf, process::Command};

/// A simple program that executes various `cargo` commands to generate code
fn main() -> Result<(), Box<dyn Error>> {
	// cargo prisma generate
	let command = Command::new("cargo")
		.args(["prisma", "generate"])
		.current_dir(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../core"))
		.spawn()?
		.wait()?;
	assert!(command.success());
	println!("Prisma client has been generated successfully!");

	let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
		.join("../../packages/types")
		.join("generated.ts");

	// cargo test --package stump_core --lib -- tests::codegen --ignored
	let command = Command::new("cargo")
		.args([
			"test",
			"--package",
			"stump_core",
			"--lib",
			"--",
			"tests::codegen",
			"--ignored",
		])
		.spawn()?
		.wait()?;
	assert!(command.success());
	assert!(path.exists());
	println!("core types have been generated successfully!");

	// cargo test --package stump_server  --bin stump_server -- routers::api::tests::codegen --ignored
	let command = Command::new("cargo")
		.args([
			"test",
			"--package",
			"stump_server",
			"--bin",
			"stump_server",
			"--",
			"routers::api::tests::codegen",
			"--ignored",
		])
		.spawn()?
		.wait()?;
	assert!(command.success());
	println!("server types have been generated successfully!");

	println!("Code generation has been completed successfully!");

	Ok(())
}
