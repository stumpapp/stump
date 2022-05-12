use std::io::BufReader;

use rocket::tokio;

// TODO: is this really the only way to achieve this?
#[path = "../prisma.rs"]
mod prisma;

use prisma::{library, media, read_progress, series, user};
use prisma_client_rust::serde_json;
use serde::{Deserialize, Serialize};

// this is not big brain solution but I am lazy
fn join_path(base: &str, rest: &str) -> String {
	let mut path = String::from(base);

	if !path.ends_with('/') {
		path.push('/');
	}

	path.push_str(rest);

	path
}

#[derive(Serialize, Deserialize)]
struct MockMedia {
	name: String,
	description: Option<String>,
	size: i32,
	extension: String,
	pages: i32,
	path: String,
}

// TODO: remove some of the code duplication here when creating media

async fn create_series_media(
	client: &prisma::PrismaClient,
	media_json: Vec<MockMedia>,
	series_id: String,
) -> Result<Vec<media::Data>, prisma_client_rust::query::Error> {
	let mut ret = vec![];

	for m in media_json {
		ret.push(
			client
				.media()
				.create(
					media::name::set(m.name),
					media::size::set(m.size),
					media::extension::set(m.extension),
					media::pages::set(m.pages),
					media::path::set(m.path),
					vec![
						media::description::set(m.description),
						media::series::link(series::id::equals(series_id.clone())),
					],
				)
				.exec()
				.await?,
		);
	}

	Ok(ret)
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
	println!("Starting seed.");

	let client = prisma::new_client().await?;

	let oromei = client
		.user()
		.create(
			user::username::set(String::from("oromei")),
			user::hashed_password::set(
				bcrypt::hash("oromei", 12).expect("Could not hash password"),
			),
			vec![user::role::set(String::from("ServerOwner"))],
		)
		.exec()
		.await?;

	println!("Created user: {} - {}", &oromei.username, &oromei.id);

	let comics_library = client
		.library()
		.create(
			library::name::set(String::from("Marvel Comics")),
			library::path::set(String::from(
				"/Users/aaronleopold/Documents/stump_tests/Marvel Comics",
			)),
			vec![],
		)
		.exec()
		.await?;

	println!(
		"Created library: {} - {}",
		&comics_library.name, &comics_library.id
	);

	// Note: I rarely need to create the media anymore, a scan is enough.
	// If you do need to create the media, comment the return statement.
	return Ok(());

	let amazing_spiderman = client
		.series()
		.create(
			series::name::set(String::from("The Amazing Spiderman (2018)")),
			series::path::set(String::from(join_path(
				&comics_library.path,
				"The Amazing Spiderman (2018)",
			))),
			vec![series::library::link(library::id::equals(
				comics_library.id.clone(),
			))],
		)
		.exec()
		.await?;

	println!(
		"Created series: {} - {}",
		&amazing_spiderman.name, &amazing_spiderman.id
	);

	let amazing_spiderman_file = std::fs::File::open("src/bin/amazing-spiderman.json")?;

	let amazing_spiderman_json: Vec<MockMedia> =
		serde_json::from_reader(BufReader::new(amazing_spiderman_file))?;

	let amazing_spiderman_books = create_series_media(
		&client,
		amazing_spiderman_json,
		amazing_spiderman.id.clone(),
	)
	.await?;

	println!("Created media for series: {}", &amazing_spiderman.id);

	let spiderman_blue = client
		.series()
		.create(
			series::name::set(String::from("Spider-Man - Blue")),
			series::path::set(String::from(join_path(
				&comics_library.path,
				"Spider-Man - Blue",
			))),
			vec![series::library::link(library::id::equals(
				comics_library.id.clone(),
			))],
		)
		.exec()
		.await?;

	println!(
		"Created series: {} - {}",
		&spiderman_blue.name, &spiderman_blue.id
	);

	let spiderman_blue_file = std::fs::File::open("src/bin/spiderman-blue.json")?;

	let spiderman_blue_json: Vec<MockMedia> =
		serde_json::from_reader(BufReader::new(spiderman_blue_file))?;

	let _spiderman_blue_books =
		create_series_media(&client, spiderman_blue_json, spiderman_blue.id.clone())
			.await?;

	println!("Created media for series: {}", &spiderman_blue.id);

	let venom = client
		.series()
		.create(
			series::name::set(String::from("Venom")),
			series::path::set(String::from(join_path(&comics_library.path, "Venom"))),
			vec![series::library::link(library::id::equals(
				comics_library.id.clone(),
			))],
		)
		.exec()
		.await?;

	println!("Created series: {} - {}", &venom.name, &venom.id);

	let venom_file = std::fs::File::open("src/bin/venom.json")?;

	let venom_json: Vec<MockMedia> = serde_json::from_reader(BufReader::new(venom_file))?;

	let venom_books = create_series_media(&client, venom_json, venom.id.clone()).await?;

	println!("Created media for series: {}", &venom.id);

	client.read_progress().create(
		read_progress::page::set(2),
		read_progress::media::link(media::id::equals(
			amazing_spiderman_books.get(0).unwrap().id.clone(),
		)),
		read_progress::user::link(user::id::equals(oromei.id.clone())),
		vec![],
	);

	client.read_progress().create(
		read_progress::page::set(6),
		read_progress::media::link(media::id::equals(
			venom_books.get(0).unwrap().id.clone(),
		)),
		read_progress::user::link(user::id::equals(oromei.id.clone())),
		vec![],
	);

	println!("Marked two books as in progress.");

	println!("Seed completed.");

	Ok(())
}
