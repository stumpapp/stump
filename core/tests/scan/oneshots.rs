use models::entity::library_config;
use sea_orm::ActiveValue::Set;
use tests::fake_data;

use super::common::{Snapshot, TestLibrary};

const ONESHOTS_DIR: &str = "_oneshots";
const SERIES_DIR: &str = "Regular Series";
const BOOK_COUNT: usize = 3;

/// two books in `_oneshots/` and one in a regular series
async fn oneshots_library(oneshots_directory: Option<&str>) -> TestLibrary {
	let library = TestLibrary::new().await;
	library.add_epub(ONESHOTS_DIR, "a");
	library.add_epub(ONESHOTS_DIR, "b");
	library.add_epub(SERIES_DIR, "c");
	set_oneshots_directory(&library, oneshots_directory).await;
	library
}

async fn set_oneshots_directory(library: &TestLibrary, value: Option<&str>) {
	library
		.update_config(library_config::ActiveModel {
			oneshots_directory: Set(value.map(str::to_string)),
			..Default::default()
		})
		.await;
}

impl Snapshot {
	fn oneshot_count(&self) -> usize {
		self.series.iter().filter(|s| s.is_oneshot).count()
	}

	/// asserts every oneshot book belongs to a oneshot series at its own path
	fn assert_oneshots_well_formed(&self) {
		for m in self.media.iter().filter(|m| m.is_oneshot) {
			let parent = self
				.series
				.iter()
				.find(|s| Some(&s.id) == m.series_id.as_ref());
			assert!(
				parent.is_some_and(|s| s.is_oneshot && s.path == m.path),
				"oneshot book {} should belong to a oneshot series at its own path\n{self:#?}",
				m.path
			);
		}
	}

	/// asserts that oneshots are enabled via asserts on the expected snapshot state
	fn assert_oneshots_enabled(&self, library: &TestLibrary) {
		self.assert_unique_media(BOOK_COUNT);
		self.assert_oneshots_well_formed();
		assert_eq!(self.oneshot_count(), 2, "{self:#?}");
		assert!(
			self.series_at(&library.path_str(ONESHOTS_DIR)).is_none(),
			"oneshots dir should not also exist as a series\n{self:#?}"
		);
	}

	/// asserts that oneshots are disabled via asserts on the expected snapshot state
	fn assert_oneshots_disabled(&self, library: &TestLibrary) {
		self.assert_unique_media(BOOK_COUNT);
		assert_eq!(self.oneshot_count(), 0, "{self:#?}"); // disabled = 0 ofc
		let folder = self
			.series_at(&library.path_str(ONESHOTS_DIR))
			.unwrap_or_else(|| panic!("oneshots dir should be a series\n{self:#?}"));
		assert_eq!(self.books_in(&folder.id), 2, "{self:#?}");
	}
}

/// a rescan without changes should effectively noop
#[tokio::test]
async fn rescan_with_oneshots_is_stable() {
	let library = oneshots_library(Some(ONESHOTS_DIR)).await;

	library.scan().await;
	library.snapshot().await.assert_oneshots_enabled(&library);

	library.assert_rescan_is_noop().await;
}

/// if i remove the oneshots dir after having it configured and oneshots created,
/// it should be converted into a normal series
#[tokio::test]
async fn removing_oneshots_directory_converts_into_normal_series() {
	let library = oneshots_library(Some(ONESHOTS_DIR)).await;
	library.scan().await;

	set_oneshots_directory(&library, None).await;
	library.scan().await;
	library.snapshot().await.assert_oneshots_disabled(&library);

	library.assert_rescan_is_noop().await;
}

/// inverse of above, if i have an existing lib and enable oneshots, and the now-oneshots
/// dir exists and has a non-oneshot series, it should convert into oneshots
#[tokio::test]
async fn adding_oneshots_directory_converts_series_to_oneshots() {
	let library = oneshots_library(None).await;
	library.scan().await;
	library.snapshot().await.assert_oneshots_disabled(&library);

	set_oneshots_directory(&library, Some(ONESHOTS_DIR)).await;
	library.scan().await;
	library.snapshot().await.assert_oneshots_enabled(&library);

	library.assert_rescan_is_noop().await;
}

/// a combination of the previous two tests, if i keep going back and forth it should maintain
/// a stable library repr between each conversion
#[tokio::test]
async fn toggling_oneshots_directory_round_trips() {
	let library = oneshots_library(Some(ONESHOTS_DIR)).await;
	library.scan().await;

	set_oneshots_directory(&library, None).await;
	library.scan().await;
	library.snapshot().await.assert_oneshots_disabled(&library);

	set_oneshots_directory(&library, Some(ONESHOTS_DIR)).await;
	library.scan().await;
	library.snapshot().await.assert_oneshots_enabled(&library);

	library.assert_rescan_is_noop().await;
}

/// a manual repr for a library to get it into a state reported on discord,
/// see: https://discord.com/channels/972593831172272148/1561138253845758064
///
/// for posterity, this is really my best idea on how this user got into
/// this bad state: initial oneshot support added, user configured the dir, books
/// series/duplicated, subsequent commit which enhanced migration to/from landed,
/// the unique/buggy state emphasized a duplication bug which otherwise wouldn't
/// happen.
///
/// so this setups up a lib so that every book in `_oneshots` has a row under the folder
/// series *and* a row under its own oneshot series
async fn create_duplicated_oneshots_scenario(library: &TestLibrary) {
	let library_id = Some(library.library.id.clone());
	let folder = fake_data::Series {
		name: Some(ONESHOTS_DIR.to_string()),
		path: Some(library.path_str(ONESHOTS_DIR)),
		library_id: library_id.clone(),
		..Default::default()
	}
	.insert(library.conn())
	.await;

	for name in ["a", "b"] {
		let book_path = library
			.path(ONESHOTS_DIR)
			.join(format!("{name}.epub"))
			.to_string_lossy()
			.to_string();

		fake_data::Media {
			series_id: folder.id.clone(),
			name: Some(name.to_string()),
			path: Some(book_path.clone()),
			..Default::default()
		}
		.insert(library.conn())
		.await;

		let oneshot = fake_data::Series {
			name: Some(name.to_string()),
			path: Some(book_path.clone()),
			library_id: library_id.clone(),
			is_oneshot: true,
			..Default::default()
		}
		.insert(library.conn())
		.await;
		fake_data::Media {
			series_id: oneshot.id,
			name: Some(name.to_string()),
			path: Some(book_path),
			is_oneshot: true,
			..Default::default()
		}
		.insert(library.conn())
		.await;
	}
}

/// if duplicates exist, they should be removed and favor whichever one
/// has reading history (for oneshots, only)
#[tokio::test]
async fn duplicated_oneshots_are_repaired_when_enabled() {
	let library = oneshots_library(Some(ONESHOTS_DIR)).await;
	create_duplicated_oneshots_scenario(&library).await;

	library.scan().await;
	library.snapshot().await.assert_oneshots_enabled(&library);

	library.assert_rescan_is_noop().await;
}

// TODO: this may change, stump has very few useful management tools in the realm of
// soft deletion + trash, duplication detect, etc. hashes are (optionally) computed
// which does help, and there is a query for it, but user friendly hooks not really
// yet

/// if duplicates exist, they are otherwise ignored
#[tokio::test]
async fn duplicated_oneshots_are_repaired_when_disabled() {
	let library = oneshots_library(None).await;
	create_duplicated_oneshots_scenario(&library).await;

	library.scan().await;
	library.snapshot().await.assert_oneshots_disabled(&library);

	library.assert_rescan_is_noop().await;
}
