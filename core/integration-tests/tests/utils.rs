extern crate stump_core;

use std::{fs, path::PathBuf, sync::Once};
use tempfile::{Builder, NamedTempFile, TempDir};

use stump_core::{
	config::Ctx,
	db::migration::run_migrations,
	fs::scanner::library_scanner::{scan_batch, scan_sync},
	job::{persist_new_job, Job, LibraryScanJob},
	prisma::{library, library_options, PrismaClient},
	types::{CoreResult, LibraryPattern, LibraryScanMode},
};

// https://web.mit.edu/rust-lang_v1.25/arch/amd64_ubuntu1404/share/doc/rust/html/book/second-edition/ch11-03-test-organization.html

// Note: this struct is used to hold the TempDir that points to the temporary directory
// used throughout the tests. It is done this way so that when the object goes out of
// scope, the directory is deleted.
pub struct TempLibrary {
	pub _dir: TempDir,
	pub root: PathBuf,
	pub library_root: PathBuf,
	pub pattern: LibraryPattern,
}

impl TempLibrary {
	fn root() -> TempDir {
		Builder::new()
			.tempdir_in(get_manifest_dir())
			.expect("Failed to create temp dir")
	}

	/// Returns a temporary directory
	// fn named_root() -> TempDir {
	// 	Builder::new()
	// 		.prefix("libraries")
	// 		// I want the temp directory to be named `libraries` exactly, so
	// 		// I'm setting the random bytes to 0, otherwise it would tack on
	// 		// a random string n chars long to the end of the name.
	// 		.rand_bytes(0)
	// 		.tempdir_in(&get_manifest_dir())
	// 		.expect("Failed to create temp dir")
	// }

	/// Builds a temporary directory structure for a collection-based library:
	///
	/// ```md
	/// .
	/// └── LIBRARY-ROOT
	///     └── collection-1
	///         ├── collection-1-nested1
	///         │   ├── collection-1-nested1-nested2
	///         │   │   └── book.zip
	///         │   └── book.zip
	///         └── book.epub
	/// ```
	pub fn collection_library() -> CoreResult<TempLibrary> {
		let root = TempLibrary::root();
		let root_path = root.path().to_path_buf();

		let collection_based_library = root_path.clone();
		let cbl_1 = collection_based_library.join("collection-1");
		let cbl_1_epub = cbl_1.join("book.epub");
		let cbl_nested_1 = cbl_1.join("collection-1-nested1");
		let cbl_nested_2 = cbl_nested_1.join("collection-1-nested1-nested2");

		fs::create_dir_all(&cbl_nested_2)?;

		fs::write(&cbl_1_epub, get_test_file_contents("book.epub"))?;
		fs::write(
			&cbl_nested_2.join("book.zip"),
			get_test_file_contents("book.zip"),
		)?;
		fs::write(
			&cbl_nested_1.join("book.zip"),
			get_test_file_contents("book.zip"),
		)?;

		Ok(TempLibrary {
			_dir: root,
			root: root_path,
			library_root: collection_based_library,
			pattern: LibraryPattern::CollectionBased,
		})
	}

	/// Builds a temporary directory structure for a series-based library:
	///
	/// ```md
	/// .
	/// └── LIBRARY-ROOT
	///     ├── book.zip
	///     ├── series-1
	///     │   └── space-book.zip
	///     └── series-2
	///         └── duck-book.zip
	/// ```
	pub fn series_library() -> CoreResult<TempLibrary> {
		let root = TempLibrary::root();
		let root_path = root.path().to_path_buf();

		let series_based_library = root_path.clone();
		let series_based_library_root_book = series_based_library.join("book.zip");
		let sbl_1 = series_based_library.join("series-1");
		let sbl_1_book = sbl_1.join("space-book.cbz");
		let sbl_2 = series_based_library.join("series-2");
		let sbl_2_book = sbl_2.join("duck-book.zip");

		fs::create_dir_all(&sbl_1)?;
		fs::create_dir_all(&sbl_2)?;

		fs::write(
			&series_based_library_root_book,
			get_test_file_contents("book.zip"),
		)?;
		fs::write(&sbl_1_book, get_test_file_contents("space-book.cbz"))?;
		fs::write(&sbl_2_book, get_test_file_contents("duck-book.zip"))?;

		Ok(TempLibrary {
			_dir: root,
			root: root_path,
			library_root: series_based_library,
			pattern: LibraryPattern::SeriesBased,
		})
	}

	/// Builds a temporary directory structure, and inserts it into the database.
	/// Returns the temporary directory, the library, and the library options.
	pub async fn create(
		client: &PrismaClient,
		pattern: LibraryPattern,
		scan_mode: LibraryScanMode,
	) -> CoreResult<(library::Data, library_options::Data, TempLibrary)> {
		let temp_library = match pattern {
			LibraryPattern::CollectionBased => TempLibrary::collection_library()?,
			LibraryPattern::SeriesBased => TempLibrary::series_library()?,
		};

		temp_library.insert(client, scan_mode).await
	}

	/// A helper to create a collection based library used in the epub tests.
	pub async fn epub_library(
		client: &PrismaClient,
	) -> CoreResult<(library::Data, library_options::Data, TempLibrary)> {
		let _tmp = TempLibrary::collection_library()?;

		_tmp.insert(client, LibraryScanMode::Batched).await
	}

	/// Gets the name of the library from the directory name.
	pub fn get_name(&self) -> &str {
		self.library_root
			.file_name()
			.unwrap()
			.to_str()
			.expect("Failed to get library name")
	}

	/// Inserts a library into the database based on the temp library
	pub async fn insert(
		self,
		client: &PrismaClient,
		scan_mode: LibraryScanMode,
	) -> CoreResult<(library::Data, library_options::Data, TempLibrary)> {
		let (library, options) = create_library(
			client,
			self.get_name(),
			self.library_root.to_str().unwrap(),
			self.pattern.clone(),
			scan_mode,
		)
		.await?;

		Ok((library, options, self))
	}
}

static INIT: Once = Once::new();

/// Deletes the test database if it exists, then runs migrations and creates a test user.
/// Meant to create a clean slate for each test that needs it.
pub async fn init_db() {
	let db_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("test.db");

	// remove existing test database
	if let Err(err) = std::fs::remove_file(&db_path) {
		// If the file doesn't exist, that's fine, but if it does exist and we can't
		// remove it, that's a problem.
		if err.kind() != std::io::ErrorKind::NotFound {
			panic!("Failed to remove existing test database: {}", err);
		}
	}

	let test_ctx = Ctx::mock().await;

	let client = test_ctx.get_db();

	// TODO: once migration engine is built into pcr, replace with commented out code below
	// client._db_push().await.expect("Failed to push database schema");
	let migration_result = run_migrations(&client).await;

	assert!(
		migration_result.is_ok(),
		"Failed to run migrations: {:?}",
		migration_result
	);

	// create test user
	let user_result = client
		.user()
		.create("oromei".into(), "1234".into(), vec![])
		.exec()
		.await;

	assert!(
		user_result.is_ok(),
		"Failed to create test user: {:?}",
		user_result
	);
}

pub async fn init_test() {
	if INIT.is_completed() {
		return;
	}

	println!("Initializing tests...");
	init_db().await;
	println!("Tests initialized.");

	INIT.call_once(|| {});
}

pub fn make_tmp_file(test_file: &str) -> CoreResult<NamedTempFile> {
	let contents = get_test_file_contents(test_file);
	let tmp_file =
		NamedTempFile::new_in(&get_manifest_dir()).expect("Failed to create temp file");

	fs::write(tmp_file.path(), contents)?;

	Ok(tmp_file)
}

pub fn get_manifest_dir() -> PathBuf {
	PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

pub fn get_test_data_dir() -> PathBuf {
	get_manifest_dir().join("data")
}

pub fn get_test_file_contents(name: &str) -> Vec<u8> {
	let path = get_test_data_dir().join(name);
	fs::read(path).expect(format!("Failed to read test file: {}", name).as_str())
}

pub async fn persist_test_job(
	id: &str,
	ctx: &Ctx,
	library: &library::Data,
	scan_mode: LibraryScanMode,
) -> CoreResult<()> {
	let job = LibraryScanJob {
		path: library.path.clone(),
		scan_mode,
	};

	let boxed: Box<dyn Job> = Box::new(job);

	persist_new_job(ctx, id.to_string(), &boxed).await?;

	Ok(())
}

/// Runs a library scan job. If the scan mode is `None`, no scan is performed.
pub async fn run_test_scan(
	ctx: &Ctx,
	library: &library::Data,
	scan_mode: LibraryScanMode,
) -> CoreResult<u64> {
	persist_test_job(&library.id, &ctx, &library, scan_mode).await?;

	if scan_mode == LibraryScanMode::None {
		return Ok(0);
	} else if scan_mode == LibraryScanMode::Batched {
		return scan_batch(ctx.get_ctx(), library.path.clone(), library.id.clone()).await;
	} else {
		return scan_sync(ctx.get_ctx(), library.path.clone(), library.id.clone()).await;
	}
}

/// Creates a library with the given name, path, and pattern. If the scan mode is
/// // not `None`, a scan is performed.
pub async fn create_library(
	client: &PrismaClient,
	name: &str,
	library_path: &str,
	pattern: LibraryPattern,
	scan_mode: LibraryScanMode,
) -> CoreResult<(library::Data, library_options::Data)> {
	let library_options_result = client
		.library_options()
		.create(vec![library_options::library_pattern::set(
			pattern.to_string(),
		)])
		.exec()
		.await;

	assert!(
		library_options_result.is_ok(),
		"Failed to create library options: {:?}",
		library_options_result
	);

	let library_options = library_options_result.unwrap();

	let library = client
		.library()
		.create(
			name.into(),
			library_path.into(),
			library_options::id::equals(library_options.id.clone()),
			vec![],
		)
		.exec()
		.await;

	assert!(library.is_ok(), "Failed to create library: {:?}", library);

	let library = library.unwrap();

	if scan_mode != LibraryScanMode::None {
		let ctx = Ctx::mock().await;
		run_test_scan(&ctx, &library, scan_mode)
			.await
			.expect("Failed to scan library");
	}

	// println!("Created library at {:?}", library_path);

	Ok((library, library_options))
}
