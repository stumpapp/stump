use crate::db::entity::macros::library_idents_select;
use crate::prisma::{library, library_config, PrismaClient};
use crate::{
	filesystem::scanner::LibraryScanJob,
	job::{JobController, JobControllerCommand},
	CoreError, CoreResult,
};
use async_trait::async_trait;
use notify::{Event, RecommendedWatcher, Watcher};
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::mpsc::error::SendError;
use tokio::sync::mpsc::{unbounded_channel, UnboundedReceiver, UnboundedSender};
use tokio::sync::Mutex;

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum LibraryWatcherCommand {
	AddWatcher(PathBuf),
	RemoveWatcher(PathBuf),
	ChangedFiles(Vec<PathBuf>),
	Flush,
	StopWatchers,
}

fn create_watcher(sender: UnboundedSender<LibraryWatcherCommand>) -> RecommendedWatcher {
	notify::recommended_watcher(move |result: Result<Event, _>| match result {
		Ok(event) => match event.kind {
			notify::EventKind::Create(_) | notify::EventKind::Modify(_) => {
				let _ = sender
					.send(LibraryWatcherCommand::ChangedFiles(event.paths))
					.map_err(|e| {
						tracing::error!(error = ?e, "Error sending file paths");
					});
			},
			_ => {},
		},
		Err(e) => {
			tracing::error!(?e, "Error processing file");
		},
	})
	.expect("Failed to create watcher")
}

struct LibraryWatcherInternal {
	wait_interval: Duration,
	sender: UnboundedSender<LibraryWatcherCommand>,
	watcher: RecommendedWatcher,
	last_update_time: Arc<Mutex<std::time::SystemTime>>,
	accumulated_paths: HashSet<PathBuf>,
	wait_thread: Option<tokio::task::JoinHandle<()>>,
}

impl LibraryWatcherInternal {
	fn new(
		watcher: RecommendedWatcher,
		sender: UnboundedSender<LibraryWatcherCommand>,
		wait_duration: Duration,
	) -> LibraryWatcherInternal {
		LibraryWatcherInternal {
			wait_interval: wait_duration,
			sender: sender.clone(),
			watcher,
			last_update_time: Arc::new(Mutex::new(std::time::SystemTime::now())),
			accumulated_paths: HashSet::new(),
			wait_thread: None,
		}
	}

	async fn handle_changed_files(&mut self, paths: Vec<PathBuf>) {
		{
			let mut last_update_time = self.last_update_time.lock().await;
			*last_update_time = std::time::SystemTime::now();
		}

		self.accumulated_paths.extend(paths);

		if self.wait_thread.is_none() {
			let sender = self.sender.clone();
			let interval = self.wait_interval;
			let last_update_time = self.last_update_time.clone();

			// send Flush command 5 seconds after the last update
			// the reason is avoid scanning a library that is still being updated. For example, if
			// a user is copying a large file we will get a inotify when the file is first create
			// and progressively as the file is being copied. We only want to trigger the scan
			// after the file has been fully copied.
			self.wait_thread = Some(tokio::spawn(async move {
				loop {
					tokio::time::sleep(interval).await;

					let last_update_time = last_update_time.lock().await;
					if let Ok(elapsed) = last_update_time.elapsed() {
						if elapsed > interval {
							let _ = sender.send(LibraryWatcherCommand::Flush);
							break;
						}
					}
				}
			}));
		}
	}

	async fn flush(&mut self) -> HashSet<PathBuf> {
		self.wait_thread = None;
		std::mem::take(&mut self.accumulated_paths)
	}
}

#[async_trait]
trait LibrariesProvider {
	async fn get_libraries(&self) -> CoreResult<Vec<library_idents_select::Data>>;
}

#[derive(Debug, Clone)]
struct LibraryProvider {
	db_client: Arc<PrismaClient>,
}

#[async_trait]
impl LibrariesProvider for LibraryProvider {
	async fn get_libraries(&self) -> CoreResult<Vec<library_idents_select::Data>> {
		// get list of all libraries
		// for each library, if watching is enabled, watch their directory
		Ok(self
			.db_client
			.library()
			.find_many(vec![
				library::status::equals("READY".to_string()),
				library::config::is(vec![library_config::watch::equals(true)]),
			])
			.select(library_idents_select::select())
			.exec()
			.await?
			.into_iter()
			.collect())
	}
}

#[async_trait]
trait SubmitScanJob {
	async fn submit(&self, id: String, path: String) -> Result<(), ()>;
}

#[derive(Clone)]
struct JobControllerSubmitter {
	job_controller: Arc<JobController>,
}

#[async_trait]
impl SubmitScanJob for JobControllerSubmitter {
	async fn submit(&self, id: String, path: String) -> Result<(), ()> {
		self.job_controller
			.push_command(JobControllerCommand::EnqueueJob(LibraryScanJob::new(
				id, path, None,
			)))
			.map_err(|e| {
				tracing::error!(error = ?e, "Error sending library scan job");
			})
	}
}

pub struct LibraryWatcher {
	sender: UnboundedSender<LibraryWatcherCommand>,
	library_provider: Arc<dyn LibrariesProvider + Send + Sync>,
	job_submitter: Arc<dyn SubmitScanJob + Send + Sync>,
}

impl LibraryWatcher {
	pub fn new(
		db_client: Arc<PrismaClient>,
		job_controller: Arc<JobController>,
	) -> LibraryWatcher {
		let library_provider = LibraryProvider { db_client };
		let job_submitter = JobControllerSubmitter { job_controller };
		let (tx, rx) = unbounded_channel();
		let watcher = create_watcher(tx.clone());
		Self::new_internal(
			tx,
			rx,
			watcher,
			library_provider,
			job_submitter,
			Duration::from_millis(5000),
		)
	}

	fn new_internal(
		tx: UnboundedSender<LibraryWatcherCommand>,
		rx: UnboundedReceiver<LibraryWatcherCommand>,
		watcher: RecommendedWatcher,
		library_provider: impl LibrariesProvider + Send + Sync + 'static,
		job_submitter: impl SubmitScanJob + Send + Sync + 'static,
		wait_duration: Duration,
	) -> LibraryWatcher {
		let this = LibraryWatcher {
			sender: tx,
			library_provider: Arc::new(library_provider),
			job_submitter: Arc::new(job_submitter),
		};

		LibraryWatcher::listen(
			watcher,
			this.sender.clone(),
			rx,
			this.library_provider.clone(),
			this.job_submitter.clone(),
			wait_duration,
		);
		this
	}

	fn listen(
		watcher: RecommendedWatcher,
		sender: UnboundedSender<LibraryWatcherCommand>,
		mut receiver: UnboundedReceiver<LibraryWatcherCommand>,
		library_provider: Arc<dyn LibrariesProvider + Send + Sync>,
		job_submitter: Arc<dyn SubmitScanJob + Send + Sync>,
		wait_duration: Duration,
	) {
		tokio::spawn(async move {
			let mut lib_watcher =
				LibraryWatcherInternal::new(watcher, sender, wait_duration);
			while let Some(command) = receiver.recv().await {
				match command {
					LibraryWatcherCommand::AddWatcher(path) => {
						tracing::debug!("Adding watcher for path: {:?}", path);
						if let Err(e) = lib_watcher
							.watcher
							.watch(path.as_path(), notify::RecursiveMode::Recursive)
						{
							tracing::error!(error = ?e, "Error adding file watcher");
							break;
						}
					},
					LibraryWatcherCommand::RemoveWatcher(path) => {
						tracing::debug!("Removing watcher for path: {:?}", path);
						if let Err(e) = lib_watcher.watcher.unwatch(path.as_path()) {
							tracing::error!(error = ?e, "Error removing file watcher");
							break;
						}
					},
					LibraryWatcherCommand::ChangedFiles(paths) => {
						lib_watcher.handle_changed_files(paths).await;
					},
					LibraryWatcherCommand::Flush => {
						let _ = Self::start_jobs(
							&library_provider,
							&job_submitter,
							lib_watcher.flush().await,
						)
						.await;
					},
					LibraryWatcherCommand::StopWatchers => {
						break;
					},
				};
			}
		});
	}

	async fn start_jobs(
		library_provider: &Arc<dyn LibrariesProvider + Send + Sync + 'static>,
		job_submitter: &Arc<dyn SubmitScanJob + Send + Sync + 'static>,
		paths: HashSet<PathBuf>,
	) -> Result<(), CoreError> {
		let libraries = library_provider.as_ref().get_libraries().await?;

		let mut libraries_to_scan = HashMap::new();
		for library in libraries {
			for path in &paths {
				if path.starts_with(&library.path) {
					libraries_to_scan.insert(library.id.clone(), library.path.clone());
				}
			}
		}

		let results = libraries_to_scan
			.into_iter()
			.map(|(id, path_str)| job_submitter.submit(id, path_str));

		for result in results {
			result.await.map_err(|e| {
				CoreError::InitializationError(format!("Failed to submit job: {:?}", e))
			})?;
		}

		Ok(())
	}

	pub async fn remove_watcher(
		&self,
		path: PathBuf,
	) -> Result<(), SendError<LibraryWatcherCommand>> {
		let result = self.sender.send(LibraryWatcherCommand::RemoveWatcher(path));
		if let Err(e) = &result {
			tracing::error!(error = ?e, "Error sending remove watcher command");
		}

		result
	}

	pub async fn stop(&self) -> Result<(), SendError<LibraryWatcherCommand>> {
		self.sender.send(LibraryWatcherCommand::StopWatchers)
	}

	pub async fn add_watcher(
		&self,
		path: PathBuf,
	) -> Result<(), SendError<LibraryWatcherCommand>> {
		self.sender
			.send(LibraryWatcherCommand::AddWatcher(path.clone()))
	}

	pub async fn init(&self) -> CoreResult<()> {
		let libraries = self.library_provider.get_libraries().await?;
		for library in libraries {
			self.add_watcher(library.path.into()).await.map_err(|e| {
				CoreError::InitializationError(format!("Failed to add watcher: {:?}", e))
			})?;
		}
		Ok(())
	}
}

mod tests {
	use super::*;

	#[allow(dead_code)]
	struct MockLibraryProvider {
		libraries: Vec<library_idents_select::Data>,
	}

	#[async_trait]
	impl LibrariesProvider for MockLibraryProvider {
		async fn get_libraries(&self) -> CoreResult<Vec<library_idents_select::Data>> {
			Ok(self.libraries.clone())
		}
	}

	#[allow(dead_code)]
	struct MockJobControllerSubmitter {
		tx: UnboundedSender<(String, String)>,
	}

	#[async_trait]
	impl SubmitScanJob for MockJobControllerSubmitter {
		async fn submit(&self, id: String, path: String) -> Result<(), ()> {
			let _ = self.tx.send((id, path)).map_err(|e| {
				eprintln!("Error sending job: {:?}", e);
			});
			Ok(())
		}
	}

	#[allow(dead_code)]
	struct MockObjs {
		library_watcher: LibraryWatcher,
		sender: UnboundedSender<LibraryWatcherCommand>,
		jobs_receiver: UnboundedReceiver<(String, String)>,
	}

	#[allow(dead_code)]
	async fn create_mock_library(
		libraries: Vec<library_idents_select::Data>,
	) -> Result<MockObjs, CoreError> {
		let (tx_jobs, rx_jobs) = tokio::sync::mpsc::unbounded_channel();
		let (tx, rx) = tokio::sync::mpsc::unbounded_channel();

		let library_provider = MockLibraryProvider { libraries };
		let job_submitter = MockJobControllerSubmitter {
			tx: tx_jobs.clone(),
		};

		let library_watcher = LibraryWatcher::new_internal(
			tx.clone(),
			rx,
			create_watcher(tx.clone()),
			library_provider,
			job_submitter,
			Duration::from_millis(10),
		);

		library_watcher.init().await.unwrap();

		Ok(MockObjs {
			library_watcher,
			sender: tx,
			jobs_receiver: rx_jobs,
		})
	}

	#[allow(dead_code)]
	fn create_test_libraries(base_dir: String) -> Vec<library_idents_select::Data> {
		vec![library_idents_select::Data {
			id: "42".to_string(),
			path: base_dir,
		}]
	}

	#[tokio::test]
	async fn test_library_watcher_init() {
		let tmp_dir = std::env::temp_dir().join("stump_test");
		std::fs::create_dir_all(&tmp_dir).unwrap();
		let libraries = create_test_libraries(tmp_dir.to_string_lossy().to_string());

		let mut mock_objs = create_mock_library(libraries).await.unwrap();

		assert!(mock_objs
			.library_watcher
			.add_watcher(tmp_dir.clone())
			.await
			.is_ok());
		let new_file = tmp_dir.join("new_file");
		assert!(mock_objs
			.sender
			.send(LibraryWatcherCommand::ChangedFiles(vec![new_file.clone()]))
			.is_ok());

		// Wait for the background thread to trigger the flush
		tokio::time::sleep(Duration::from_millis(100)).await;
		let (id, path) = mock_objs.jobs_receiver.try_recv().expect("Expected a job");
		assert_eq!(id, "42");
		assert_eq!(path, tmp_dir.to_string_lossy().to_string());
	}

	#[tokio::test]
	async fn test_remove() {
		let tmp_dir = std::env::temp_dir().join("stump_test");
		std::fs::create_dir_all(&tmp_dir).unwrap();
		let libraries = create_test_libraries(tmp_dir.to_string_lossy().to_string());

		let mock_objs = create_mock_library(libraries).await.unwrap();

		assert!(mock_objs
			.library_watcher
			.add_watcher(tmp_dir.clone())
			.await
			.is_ok());
		assert!(mock_objs
			.library_watcher
			.remove_watcher(tmp_dir.clone())
			.await
			.is_ok());

		// try removing again
		assert!(mock_objs
			.library_watcher
			.remove_watcher(tmp_dir.clone())
			.await
			.is_ok());
	}

	#[tokio::test]
	async fn test_add_watcher_twice() {
		let tmp_dir = std::env::temp_dir().join("stump_test");
		std::fs::create_dir_all(&tmp_dir).unwrap();
		let libraries = create_test_libraries(tmp_dir.to_string_lossy().to_string());

		let mock_objs = create_mock_library(libraries).await.unwrap();
		assert!(mock_objs
			.library_watcher
			.add_watcher(tmp_dir.clone())
			.await
			.is_ok());
		assert!(mock_objs
			.library_watcher
			.add_watcher(tmp_dir.clone())
			.await
			.is_ok());
	}

	#[tokio::test]
	async fn test_library_watcher_stop() {
		let tmp_dir = std::env::temp_dir().join("stump_test");
		std::fs::create_dir_all(&tmp_dir).unwrap();
		let libraries = create_test_libraries(tmp_dir.to_string_lossy().to_string());

		let mock_objs = create_mock_library(libraries).await.unwrap();

		assert!(mock_objs
			.library_watcher
			.add_watcher(tmp_dir.clone())
			.await
			.is_ok());
		let new_file = tmp_dir.join("new_file");
		assert!(mock_objs
			.sender
			.send(LibraryWatcherCommand::ChangedFiles(vec![new_file.clone()]))
			.is_ok());
		assert!(mock_objs.library_watcher.stop().await.is_ok());
	}

	#[tokio::test]
	async fn test_start_jobs() {
		let tmp_dir = std::env::temp_dir().join("stump_test");
		std::fs::create_dir_all(&tmp_dir).unwrap();
		let libraries = create_test_libraries(tmp_dir.to_string_lossy().to_string());

		let paths = HashSet::from_iter(vec![tmp_dir.clone().join("new_file")]);

		let mut mock_objs = create_mock_library(libraries).await.unwrap();

		assert!(LibraryWatcher::start_jobs(
			&mock_objs.library_watcher.library_provider,
			&mock_objs.library_watcher.job_submitter,
			paths,
		)
		.await
		.is_ok());

		let (id, path) = mock_objs.jobs_receiver.try_recv().expect("Expected a job");
		assert_eq!(id, "42");
		assert_eq!(path, tmp_dir.to_string_lossy().to_string());
	}

	#[tokio::test]
	async fn test_start_jobs_on_bad_library() {
		let tmp_dir = std::env::temp_dir().join("stump_test");
		std::fs::create_dir_all(&tmp_dir).unwrap();
		let libraries = create_test_libraries(tmp_dir.to_string_lossy().to_string());

		let bad_paths =
			HashSet::from_iter(vec![PathBuf::from("/home/user/test/new_file")]);

		let mut mock_objs = create_mock_library(libraries).await.unwrap();

		assert!(LibraryWatcher::start_jobs(
			&mock_objs.library_watcher.library_provider,
			&mock_objs.library_watcher.job_submitter,
			bad_paths,
		)
		.await
		.is_ok());

		assert_eq!(
			mock_objs.jobs_receiver.try_recv().unwrap_err(),
			tokio::sync::mpsc::error::TryRecvError::Empty
		);
	}
}
