use chrono::prelude::{DateTime, Utc};
use std::process::Command;

fn get_git_rev() -> Option<String> {
	let output = Command::new("git")
		.args(["rev-parse", "--short", "HEAD"])
		.output()
		.ok()?;

	if output.status.success() {
		String::from_utf8(output.stdout).ok()
	} else {
		None
	}
}

fn get_compile_date() -> String {
	let system_time = std::time::SystemTime::now();
	let date_time: DateTime<Utc> = system_time.into();
	format!("{}", date_time.format("%+"))
}

fn main() {
	println!("cargo:rustc-env=STATIC_BUILD_DATE={}", get_compile_date());

	if let Some(rev) = get_git_rev() {
		println!("cargo:rustc-env=GIT_REV={}", rev);
	}
}
