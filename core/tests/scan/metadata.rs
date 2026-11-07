use std::fs::create_dir_all;

use models::{
	entity::{library_config, series},
	shared::enums::{OrganizationMode, SeriesKind},
};
use sea_orm::ActiveValue::Set;
use tests::fixtures::write_test_epub;

use super::common::{Snapshot, TestLibrary};

async fn metadata_library() -> TestLibrary {
	let library = TestLibrary::new().await;
	library
		.update_config(library_config::ActiveModel {
			organization_mode: Set(OrganizationMode::Metadata),
			process_metadata: Set(true),
			..Default::default()
		})
		.await;
	library
}

impl TestLibrary {
	fn add_ebook(&self, dir: &str, name: &str, series: Option<&str>) -> String {
		let dir = self.path(dir);
		create_dir_all(&dir).expect("failed to create dir");
		let path = dir
			.join(format!("{name}.epub"))
			.to_string_lossy()
			.to_string();
		write_ebook(&path, series);
		path
	}
}

fn write_ebook(path: &str, series: Option<&str>) {
	let metadata = series
		.map(|name| format!(r#"<meta name="calibre:series" content="{name}"/>"#))
		.unwrap_or_default();
	write_test_epub(path, "Test", &metadata);
}

impl Snapshot {
	fn virtual_series(&self, name: &str) -> Option<&series::Model> {
		self.series
			.iter()
			.find(|s| s.kind == SeriesKind::Virtual && s.name == name)
	}

	fn series_of(&self, path: &str) -> Option<&str> {
		self.media
			.iter()
			.find(|m| m.path == path)
			.expect("should have book at path")
			.series_id
			.as_deref()
	}
}

/// books are grouped by their metadata series and books without one series exist
/// effectively as standalones within the library
#[tokio::test]
async fn test_books_are_grouped_by_metadata_series() {
	let library = metadata_library().await;
	let first = library.add_ebook(
		"Becky Chambers",
		"The Long Way to a Small, Angry Planet",
		Some("Wayfarers"),
	);
	let second = library.add_ebook(
		"Becky Chambers/A Closed and Common Orbit",
		// ^ calibre does nesting and is common enough
		"A Closed and Common Orbit",
		Some("Wayfarers"),
	);
	let other = library.add_ebook(
		"Martha Wells",
		"All Systems Red",
		Some("The Murderbot Diaries"),
	);
	let standalone = library.add_ebook("", "Some Standalone", None);

	library.scan().await;
	let snapshot = library.snapshot().await;
	snapshot.assert_unique_media(4);

	assert_eq!(snapshot.series.len(), 2);

	let wayfarers = snapshot
		.virtual_series("Wayfarers")
		.expect("should have a virtual series for wayfarers");
	let murderbot = snapshot
		.virtual_series("The Murderbot Diaries")
		.expect("should have a virtual series for murderbot");

	assert_eq!(wayfarers.path, None);
	assert_eq!(snapshot.series_of(&first), Some(wayfarers.id.as_str()));
	assert_eq!(snapshot.series_of(&second), Some(wayfarers.id.as_str()));
	assert_eq!(snapshot.series_of(&other), Some(murderbot.id.as_str()));
	assert_eq!(snapshot.series_of(&standalone), None);
	assert!(snapshot
		.media
		.iter()
		.all(|m| m.library_id == library.library.id));

	library.assert_rescan_is_noop().await;
	// ^ sanity check
}

/// changing a book's series on disk moves it, and the virtual series it left empty is removed
#[tokio::test]
async fn test_changed_metadata_moves_book_and_removes_empty_series() {
	let library = metadata_library().await;
	library.add_ebook(
		"Becky Chambers",
		"The Long Way to a Small, Angry Planet",
		Some("Wayfarers"),
	);
	let book = library.add_ebook(
		"Becky Chambers/A Closed and Common Orbit",
		// ^ calibre does nesting and is common enough
		"A Closed and Common Orbit",
		Some("The Wayfarers"),
		// ^ wrong, no 'the'
	);

	library.scan().await;
	let snapshot = library.snapshot().await;

	assert_eq!(snapshot.series.len(), 2);
	assert!(snapshot
		.series
		.iter()
		.all(|series| series.name.contains("Wayfarers")));
	// ^ we have 'Wayfarers' and 'The Wayfarers'
	snapshot.assert_unique_media(2);

	write_ebook(&book, Some("Wayfarers"));
	library.scan().await;
	// ^ we edited the wrong one to remove the article and now it should
	// be empty and thus removed

	let snapshot = library.snapshot().await;
	snapshot.assert_unique_media(2);
	assert!(
		snapshot.virtual_series("The Wayfarers").is_none(),
		"empty series should have been removed"
	);
	let wayfarers = snapshot
		.virtual_series("Wayfarers")
		.expect("should have virtual series for wayfarers");
	assert_eq!(snapshot.series_of(&book), Some(wayfarers.id.as_str()));

	library.assert_rescan_is_noop().await;
	// ^ sanity check
}
