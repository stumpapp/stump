use anyhow::Result;
use prisma_client_rust::raw;
use serde::Deserialize;
use std::io::BufReader;

use include_dir::{include_dir, Dir};

use crate::{
	fs::checksum::digest_from_reader,
	prisma::{self, migration},
};

static MIGRATIONS_DIR: Dir = include_dir!("$CARGO_MANIFEST_DIR/prisma/migrations");
const CREATE_MIGRATIONS_TABLE: &str =
	include_str!("../../prisma/migrations/migrations.sql");

#[derive(Deserialize, Debug)]
pub struct CountQueryReturn {
	pub count: u32,
}

impl Default for CountQueryReturn {
	fn default() -> Self {
		Self { count: 0 }
	}
}

fn get_sql_stmts(sql_str: &str) -> Vec<&str> {
	sql_str
		.split(";")
		.filter(|s| !s.trim().is_empty())
		.collect()
}

pub async fn run_migrations(db: &prisma::PrismaClient) -> Result<()> {
	log::info!("Running migrations");

	log::debug!("Checking for `migrations` table");

	let res: Vec<CountQueryReturn> = db
		._query_raw(raw!(
			"SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='migrations';"
		))
		.exec()
		.await?;

	// If the table doesn't exist, create it
	if res.get(0).unwrap().count == 0 {
		log::debug!("`migrations` table not found, creating it");

		let stmts = get_sql_stmts(CREATE_MIGRATIONS_TABLE);

		for stmt in stmts {
			log::debug!("{}", stmt);
			db._execute_raw(raw!(stmt)).exec().await?;
		}

		log::debug!("`migrations` table created");
	} else {
		log::debug!("`migrations` table already exists");
	}

	// migration structure: directory with name like [timstamp: i64]_[name], with a file named migration.sql
	let mut migration_dirs = MIGRATIONS_DIR.dirs().collect::<Vec<&Dir>>();

	log::debug!("Found {} migrations", migration_dirs.len());

	// **must ensure** we run the migrations in order of timestamp
	migration_dirs.sort_by(|a, b| {
		let a_filename = a.path().file_name().unwrap().to_str().unwrap();
		let b_filename = b.path().file_name().unwrap().to_str().unwrap();

		// timestamp is the first 14 chars, e.g. 20220525133313_initial_migration -> 20220525133313
		let a_timestamp = a_filename[..14].parse::<i64>().unwrap();
		let b_timestamp = b_filename[..14].parse::<i64>().unwrap();

		a_timestamp.cmp(&b_timestamp)
	});

	log::debug!("Migrations sorted by timestamp");

	for dir in migration_dirs {
		let name = dir.path().file_name().unwrap().to_str().unwrap();

		let sql_file = dir.get_file(dir.path().join("migration.sql")).unwrap();
		let sql_str = sql_file.contents_utf8().unwrap();

		let checksum = digest_from_reader(BufReader::new(sql_file.contents()))?;

		let existing_migration = db
			.migration()
			.find_unique(migration::checksum::equals(checksum.clone()))
			.exec()
			.await?;

		// Only run migrations that have not been run yet
		// TODO: check success?
		if existing_migration.is_some() {
			log::debug!(
				"Migration {} already applied (checksum: {})",
				name,
				checksum
			);
			continue;
		}

		log::debug!("Running migration {}", name);

		let stmts = get_sql_stmts(sql_str);

		// TODO: do I bother letting this process continue with failed migrations?
		// I don't see why I should, if the previous migration fails I feel like
		// the next one shouldn't get run. Which makes the success field on migrations
		// pointless. TBD.
		for stmt in stmts {
			log::debug!("{}", stmt);

			match db._execute_raw(raw!(stmt)).exec().await {
				Ok(_) => continue,
				Err(e) => {
					log::error!("Migration {} failed: {}", name, e);

					db.migration()
						.create(
							name.to_string(),
							checksum.clone(),
							vec![migration::success::set(false)],
						)
						.exec()
						.await?;

					return Err(anyhow::anyhow!(e));
				},
			};
		}

		log::debug!("Migration {} applied", name);

		db.migration()
			.create(
				name.to_string(),
				checksum.clone(),
				vec![migration::success::set(true)],
			)
			.exec()
			.await?;
	}

	log::info!("Migrations complete");

	Ok(())
}
