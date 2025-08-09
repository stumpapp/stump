use std::{
	fs,
	path::{Path, PathBuf},
	sync::Arc,
};

use prisma_client_rust::QueryError;
use stump_core::{
	db::entity::{LibraryConfig, LibraryPattern},
	prisma::{self, PrismaClient},
	CoreResult,
};

use super::get_test_file_contents;

// Note: this struct is used to hold the TempDir that points to the temporary directory
// used throughout the tests. It is done this way so that when the object goes out of
// scope, the directory is deleted.
#[allow(dead_code)]
pub struct TempLibrary {
	pub library_root: PathBuf,
	pub pattern: LibraryPattern,
}

impl TempLibrary {
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
	#[allow(dead_code)]
	pub fn collection_library(root: &Path) -> CoreResult<Self> {
		let library_root = root.join("collection_library");
		let cbl_1 = library_root.join("collection-1");
		let cbl_1_epub = cbl_1.join("book.epub");
		let cbl_nested_1 = cbl_1.join("collection-1-nested1");
		let cbl_nested_2 = cbl_nested_1.join("collection-1-nested1-nested2");

		fs::create_dir_all(&cbl_nested_2)?;

		fs::write(&cbl_1_epub, get_test_file_contents("book.epub"))?;
		fs::write(
			cbl_nested_2.join("book.zip"),
			get_test_file_contents("book.zip"),
		)?;
		fs::write(
			cbl_nested_1.join("book.zip"),
			get_test_file_contents("book.zip"),
		)?;

		Ok(TempLibrary {
			library_root,
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
	#[allow(dead_code)]
	pub fn series_library(root: &Path) -> CoreResult<TempLibrary> {
		let library_root = root.join("series_library");
		let series_based_library_root_book = library_root.join("book.zip");
		let sbl_1 = library_root.join("series-1");
		let sbl_1_book = sbl_1.join("science_comics_001.cbz");
		let sbl_2 = library_root.join("series-2");
		let sbl_2_book = sbl_2.join("book.zip");

		fs::create_dir_all(&sbl_1)?;
		fs::create_dir_all(&sbl_2)?;

		fs::write(
			&series_based_library_root_book,
			get_test_file_contents("book.zip"),
		)?;
		fs::write(
			&sbl_1_book,
			get_test_file_contents("science_comics_001.cbz"),
		)?;
		fs::write(&sbl_2_book, get_test_file_contents("book.zip"))?;

		Ok(TempLibrary {
			library_root,
			pattern: LibraryPattern::SeriesBased,
		})
	}

	/// Gets the name of the library from the directory name.
	#[allow(dead_code)]
	pub fn get_name(&self) -> &str {
		self.library_root
			.file_name()
			.unwrap()
			.to_str()
			.expect("Failed to get library name")
	}
}

#[allow(dead_code)]
pub async fn create_library(
	db: Arc<PrismaClient>,
	library_name: &str,
	library_path: &str,
	library_config: LibraryConfig,
) -> (prisma::library::Data, prisma::library_config::Data) {
	let result: Result<(_, _), QueryError> = db
		._transaction()
		.with_timeout(10 * 1000)
		.run(|client| async move {
			let ignore_rules = (!library_config.ignore_rules.is_empty())
				.then(|| library_config.ignore_rules.as_bytes())
				.transpose()
				.expect("Ignore rules should exist");
			let thumbnail_config = library_config
				.thumbnail_config
				.map(|options| options.as_bytes())
				.transpose()
				.expect("Thumbnail config should exist");

			let library_config = client
				.library_config()
				.create(vec![
					prisma::library_config::convert_rar_to_zip::set(
						library_config.convert_rar_to_zip,
					),
					prisma::library_config::hard_delete_conversions::set(
						library_config.hard_delete_conversions,
					),
					prisma::library_config::process_metadata::set(
						library_config.process_metadata,
					),
					prisma::library_config::generate_file_hashes::set(
						library_config.generate_file_hashes,
					),
					prisma::library_config::default_reading_dir::set(
						library_config.default_reading_dir.to_string(),
					),
					prisma::library_config::default_reading_image_scale_fit::set(
						library_config.default_reading_image_scale_fit.to_string(),
					),
					prisma::library_config::default_reading_mode::set(
						library_config.default_reading_mode.to_string(),
					),
					prisma::library_config::library_pattern::set(
						library_config.library_pattern.to_string(),
					),
					prisma::library_config::thumbnail_config::set(thumbnail_config),
					prisma::library_config::ignore_rules::set(ignore_rules),
				])
				.exec()
				.await
				.unwrap();

			let library = client
				.library()
				.create(
					library_name.to_string(),
					library_path.to_string(),
					prisma::library_config::id::equals(library_config.id.clone()),
					vec![prisma::library::description::set(None)],
				)
				.exec()
				.await
				.unwrap();

			let library_config = client
				.library_config()
				.update(
					prisma::library_config::id::equals(library_config.id),
					vec![
						prisma::library_config::library::connect(
							prisma::library::id::equals(library.id.clone()),
						),
						prisma::library_config::library_id::set(Some(library.id.clone())),
					],
				)
				.exec()
				.await
				.unwrap();

			Ok((library, library_config))
		})
		.await;

	result.unwrap()
}
