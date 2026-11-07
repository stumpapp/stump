use std::{
	collections::HashMap,
	path::{Path, PathBuf},
	sync::Arc,
};

use apalis::prelude::MemoryStorage;
use models::entity::{library, library_config, media, series};
use sea_orm::{prelude::*, DatabaseConnection};
use stump_core::{
	config::StumpConfig,
	database::connect_at,
	job::{
		ApalisWorkerState, JobContext, JobLifecycle, JobOutputExt, StumpJob, WorkingState,
	},
	scan::library::{LibraryScanJob, LibraryScanOutput},
	CoreEvent,
};
use tempfile::TempDir;
use tests::{fake_data, fixtures::get_test_epub_path};
use tokio::sync::broadcast;

/// a testing library which owns the necessary pieces for various scanner-related
/// testing integration tests
pub struct TestLibrary {
	pub state: Arc<ApalisWorkerState>,
	pub library: library::Model,
	root: TempDir,
	// only held so emitted events don't log send errors, we don't really
	// need it otherwise
	_events: broadcast::Receiver<CoreEvent>,
}

impl TestLibrary {
	pub async fn new() -> Self {
		let root = TempDir::new().expect("failed to create library dir");

		let conn = connect_at("sqlite::memory:")
			.await
			.expect("failed to connect to db");

		let library = fake_data::Library {
			path: Some(root.path().to_string_lossy().to_string()),
			..Default::default()
		}
		.insert(&conn)
		.await;

		let (events_tx, events) = broadcast::channel(1024);
		let state = Arc::new(ApalisWorkerState::new(
			Arc::new(conn),
			Arc::new(StumpConfig::debug()),
			events_tx,
			MemoryStorage::new(),
		));

		Self {
			state,
			library,
			root,
			_events: events,
		}
	}

	pub fn conn(&self) -> &DatabaseConnection {
		self.state.conn.as_ref()
	}

	/// the resolved path of `relative` within the library root
	pub fn path(&self, relative: &str) -> PathBuf {
		self.root.path().join(relative)
	}

	/// same as [`TestLibrary::path`] and to string'ed
	pub fn path_str(&self, relative: &str) -> String {
		self.path(relative).to_string_lossy().to_string()
	}

	/// copies a known fixture file to the specified, relative spot within the library
	pub fn add_book(
		&self,
		fixture: impl AsRef<Path>,
		dir: &str,
		file_name: &str,
	) -> String {
		let dir = self.path(dir);
		std::fs::create_dir_all(&dir).expect("failed to create dir");
		let book = dir.join(file_name);
		std::fs::copy(fixture, &book).expect("failed to copy fixture");
		book.to_string_lossy().to_string()
	}

	/// shorthand for [`TestLibrary::add_book`] with the standard epub test file
	pub fn add_epub(&self, dir: &str, name: &str) -> String {
		self.add_book(get_test_epub_path(), dir, &format!("{name}.epub"))
	}

	/// updates the config with whatever changed in the active model provided
	pub async fn update_config(&self, changes: library_config::ActiveModel) {
		let result = library_config::Entity::update_many()
			.set(changes)
			.filter(library_config::Column::LibraryId.eq(&self.library.id))
			.exec(self.conn())
			.await
			.expect("failed to update library config");
		assert_eq!(result.rows_affected, 1, "library config missing");
	}

	/// runs a full library scan, manually copying the task loop from `dispatch::run_job` but
	/// localized outside of the job system (which would be way too much of a headache to try
	/// and work with)
	pub async fn scan(&self) -> LibraryScanOutput {
		let mut job =
			LibraryScanJob::new(self.library.id.clone(), self.library.path.clone(), None);
		let ctx = JobContext::new(
			Arc::clone(&self.state),
			Uuid::new_v4().to_string(),
			&StumpJob::library_scan(
				self.library.id.clone(),
				self.library.path.clone(),
				None,
			),
		)
		.await
		.expect("failed to create job context");

		let WorkingState {
			output, mut tasks, ..
		} = job.init(&ctx).await.expect("scan init failed");
		let mut output = output.unwrap_or_default();

		while let Some(task) = tasks.pop_front() {
			let task_output = job
				.execute_task(&ctx, task)
				.await
				.expect("scan task failed");
			output.update(task_output.output);
			for subtask in task_output.subtasks.into_iter().rev() {
				tasks.push_front(subtask);
			}
		}

		job.finalize(&ctx, &output)
			.await
			.expect("scan finalize failed");

		output
	}

	/// rescans the library and asserts nothing changed
	pub async fn assert_rescan_is_noop(&self) {
		let before = self.snapshot().await;
		let output = self.scan().await;
		let changed = output.created_media
			+ output.updated_media
			+ output.created_series
			+ output.updated_series;
		assert_eq!(changed, 0, "rescan reported changes: {output:#?}");
		self.snapshot().await.assert_unchanged_from(&before);
	}

	pub async fn snapshot(&self) -> Snapshot {
		let series = series::Entity::find()
			.filter(series::Column::LibraryId.eq(&self.library.id))
			.all(self.conn())
			.await
			.expect("failed to load series");
		let media = media::Entity::find()
			.all(self.conn())
			.await
			.expect("failed to load media");
		Snapshot { series, media }
	}
}

/// the series and media records for a library at a point in time, used for various
/// in-memory assertions after scan operations.
///
/// NOTE: i do log this for failures, so a reminder to self to keep the fake libs a
/// bit on the smaller side to not blow up the console
#[derive(Debug)]
pub struct Snapshot {
	pub series: Vec<series::Model>,
	pub media: Vec<media::Model>,
}

impl Snapshot {
	pub fn series_at(&self, path: &str) -> Option<&series::Model> {
		self.series.iter().find(|s| s.path.as_deref() == Some(path))
	}

	pub fn books_in(&self, series_id: &str) -> usize {
		self.media
			.iter()
			.filter(|m| m.series_id.as_deref() == Some(series_id))
			.count()
	}

	/// asserts each book is not duplicated and that there are only the expected amount
	pub fn assert_unique_media(&self, expected: usize) {
		let mut rows_per_path = HashMap::<&str, usize>::new();
		for m in &self.media {
			*rows_per_path.entry(&m.path).or_default() += 1;
		}
		let duplicated: Vec<_> = rows_per_path.iter().filter(|(_, n)| **n > 1).collect();
		assert!(
			duplicated.is_empty(),
			"duplicate media records {duplicated:?}\n{self:#?}"
		);
		assert_eq!(
			self.media.len(),
			expected,
			"unexpected media count\n{self:#?}"
		);
	}

	/// asserts every record's identity matches `before` state, not a fully-inclusive compare
	/// but the important bits (id, path, membership, oneshot flag)
	pub fn assert_unchanged_from(&self, before: &Snapshot) {
		assert_eq!(
			self.identity(),
			before.identity(),
			"records changed\nbefore: {before:#?}\nafter: {self:#?}"
		);
	}

	fn identity(&self) -> (Vec<SeriesIdentity<'_>>, Vec<MediaIdentity<'_>>) {
		let mut series: Vec<_> = self
			.series
			.iter()
			.map(|s| {
				(
					s.id.as_str(),
					s.path.as_deref().unwrap_or_default(),
					s.is_oneshot,
				)
			})
			.collect();
		let mut media: Vec<_> = self
			.media
			.iter()
			.map(|m| {
				(
					m.id.as_str(),
					m.path.as_str(),
					m.series_id.as_deref(),
					m.is_oneshot,
				)
			})
			.collect();
		series.sort();
		media.sort();
		(series, media)
	}
}

/// (id, path, is_oneshot)
type SeriesIdentity<'a> = (&'a str, &'a str, bool);
/// (id, path, series_id, is_oneshot)
type MediaIdentity<'a> = (&'a str, &'a str, Option<&'a str>, bool);
