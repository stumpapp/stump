use rocket::tokio;

// TODO: is this really the only way to achieve this?
#[path = "../prisma.rs"]
mod prisma;

use prisma::{library, user};

use clap::Parser;

// this is not big brain solution but I am lazy
fn join_path(base: &str, rest: &str) -> String {
	let mut path = String::from(base);

	if !path.ends_with('/') {
		path.push('/');
	}

	path.push_str(rest);

	path
}

/// Seed program for Stump development.
#[derive(Parser, Debug)]
#[clap(author, version, about, long_about = None)]
struct Args {
	/// Name of the library to seed.
	#[clap(short, long)]
	library_path: Option<String>,

	/// Name of the managing user account to seed.
	#[clap(short, long)]
	user_name: Option<String>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
	println!("Starting seed...");

	let args = Args::parse();

	let library_path = match args.library_path {
		Some(path) => path,
		None => {
			let home = dirs::home_dir().expect("Could not find home directory");

			// Default library will be what I use for testing
			join_path(&home.to_str().unwrap(), "Documents/Stump/Marvel Comics")
		},
	};

	let library_name = library_path.split('/').last().unwrap();

	let user_name = match args.user_name {
		Some(name) => name,
		None => "oromei".to_string(),
	};

	println!(
		"Seed configured: library={}, user={}",
		&library_path, &user_name
	);

	let client = prisma::new_client().await?;

	let user = client
		.user()
		.create(
			user::username::set(user_name.clone()),
			user::hashed_password::set(
				bcrypt::hash(user_name.clone(), 12).expect("Could not hash password"),
			),
			vec![user::role::set(String::from("SERVER_OWNER"))],
		)
		.exec()
		.await?;

	println!("Created user: {} - {}", &user.username, &user.id);

	let comics_library = client
		.library()
		.create(
			library::name::set(String::from("Marvel Comics")),
			library::path::set(library_path.clone()),
			vec![],
		)
		.exec()
		.await?;

	println!(
		"Created library: {} - {}",
		&comics_library.name, &comics_library.id
	);

	println!("\nSeed completed.");

	println!("Be sure to spawn a 'ScannerJob' to populate the library: POST /api/libraries/{}/scan, or you may use the UI", comics_library.id);

	Ok(())
}
