use chrono::prelude::{DateTime, Utc};
use std::{process::Command, time::SystemTime};

fn main() {
	let system_time = SystemTime::now();
	let date_time: DateTime<Utc> = system_time.into();
	let compiled_at = format!("{}", date_time.format("%+"));

	println!("cargo:rustc-env=STATIC_BUILD_DATE={}", compiled_at);

	let rev = match std::env::var("GIT_REV") {
		Ok(rev) => rev,
		Err(_) => {
			let output = Command::new("git")
		.args(["rev-parse", "--short", "HEAD"])
		.output()
		.expect("Failed to execute `git rev-parse --short HEAD`. Could not determine git revision!");

			String::from_utf8(output.stdout).expect("Failed to parse git revision!")
		},
	};

	println!("cargo:rustc-env=GIT_REV={}", rev);

	if let Ok(build_channel) = std::env::var("BUILD_CHANNEL") {
		println!("cargo:rustc-env=BUILD_CHANNEL={}", build_channel);
	}
}
