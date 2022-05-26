use anyhow::Result;
use std::io::BufReader;

use include_dir::{include_dir, Dir};

use crate::{
	fs::checksum::digest_from_reader,
	prisma::{self, migration},
};

static MIGRATIONS_DIR: Dir = include_dir!("$CARGO_MANIFEST_DIR/prisma/migrations");
const CREATE_MIGRATIONS_TABLE: &str =
	include_str!("../../prisma/migrations/migrations.sql");

// https://github.com/Brendonovich/prisma-client-rust/discussions/57
// Cannot complete this until above is resolved :(
pub async fn run_migrations(db: &prisma::PrismaClient) -> Result<()> {
	// // Check if the migration table exists
	// let count = ... "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='migrations';

	// If the table doesn't exist, create it
	// if count == 0 {
	// 	log::info!("Creating migrations table");
	// }

	// migration structure: directory with name like [timstamp: i64]_[name], with a file named migration.sql
	let mut migration_dirs = MIGRATIONS_DIR.dirs().collect::<Vec<&Dir>>();

	log::info!("Found {} migrations", migration_dirs.len());

	// **must ensure** we run the migrations in order of timestamp
	migration_dirs.sort_by(|a, b| {
		let a_filename = a.path().file_name().unwrap().to_str().unwrap();
		let b_filename = b.path().file_name().unwrap().to_str().unwrap();

		// timestamp is the first 14 chars, e.g. 20220525133313_initial_migration -> 20220525133313
		let a_timestamp = a_filename[..14].parse::<i64>().unwrap();
		let b_timestamp = b_filename[..14].parse::<i64>().unwrap();

		a_timestamp.cmp(&b_timestamp)
	});

	for dir in migration_dirs {
		let name = dir.path().file_name().unwrap().to_str().unwrap();

		let sql_file = dir.get_file("migration.sql").unwrap();
		let sql_str = sql_file.contents_utf8().unwrap();

		let checksum = digest_from_reader(BufReader::new(sql_file.contents()))?;

		log::info!("{:?}", &checksum);

		let existing_migration = db
			.migration()
			.find_unique(migration::checksum::equals(checksum.clone()))
			.exec()
			.await?;

		// Only run migrations that have not been run yet
		if existing_migration.is_some() {
			continue;
		}

		log::info!("Running migration {}", name);

		// TODO: run the migration
		// db._query_raw(sql_str).await?;

		// TODO: do I bother letting this process continue with failed migrations?
		// I don't see why I should, if the previous migration fails I feel like
		// the next one shouldn't get run. Which makes the success field on migrations
		// pointless. TBD.

		db.migration()
			.create(
				migration::name::set(name.to_string()),
				migration::checksum::set(checksum.clone()),
				vec![migration::success::set(true)],
			)
			.exec()
			.await?;
	}

	Ok(())
}
