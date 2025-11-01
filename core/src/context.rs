use std::sync::Arc;

use models::entity::server_config;
use sea_orm::{prelude::*, DatabaseConnection, MockDatabase, SelectColumns};
use tokio::sync::{
	broadcast::{channel, Receiver, Sender},
	mpsc::error::SendError,
};

use crate::{
	config::StumpConfig,
	database,
	event::CoreEvent,
	filesystem::scanner::LibraryWatcher,
	job::{Executor, JobController, JobControllerCommand},
	CoreError, CoreResult,
};

type EventChannel = (Sender<CoreEvent>, Receiver<CoreEvent>);

/// Struct that holds the main context for a Stump application. This is passed around
/// to all the different parts of the application, and is used to access the database
/// and manage the event channels.
#[derive(Clone)]
pub struct Ctx {
	pub config: Arc<StumpConfig>,
	pub conn: Arc<DatabaseConnection>,
	pub job_controller: Arc<JobController>,
	pub event_channel: Arc<EventChannel>,
	pub library_watcher: Arc<LibraryWatcher>,
}

impl Ctx {
	/// Creates a new [Ctx] instance. This should only be called once per application.
	/// It takes a sender for the internal event channel, so the core can send events
	/// to the consumer.
	///
	/// ## Example
	/// ```no_run
	/// use stump_core::{Ctx, config::StumpConfig};
	/// use tokio::sync::mpsc::unbounded_channel;
	///
	/// #[tokio::main]
	/// async fn main() {
	///    let config = StumpConfig::debug();
	///    let ctx = Ctx::new(config).await;
	/// }
	/// ```
	pub async fn new(config: StumpConfig) -> Ctx {
		let config = Arc::new(config.clone());
		let conn = Arc::new(
			database::connect(&config)
				.await
				.expect("Failed to connect to database"),
		);
		let event_channel = Arc::new(channel::<CoreEvent>(1024));

		let job_controller =
			JobController::new(conn.clone(), config.clone(), event_channel.0.clone());
		let library_watcher =
			Arc::new(LibraryWatcher::new(conn.clone(), job_controller.clone()));

		Ctx {
			config,
			conn,
			job_controller,
			event_channel,
			library_watcher,
		}
	}

	/// Creates a [Ctx] instance for testing **only**
	pub fn mock_sea(mock_db: MockDatabase) -> Ctx {
		let config = Arc::new(StumpConfig::debug());

		let event_channel = Arc::new(channel::<CoreEvent>(1024));
		let conn = Arc::new(mock_db.into_connection());

		// Create job manager
		let job_controller =
			JobController::new(conn.clone(), config.clone(), event_channel.0.clone());
		let library_watcher =
			Arc::new(LibraryWatcher::new(conn.clone(), job_controller.clone()));

		Ctx {
			config,
			conn,
			job_controller,
			event_channel,
			library_watcher,
		}
	}

	/// Wraps the [Ctx] in an [Arc], allowing it to be shared across threads. This
	/// is just a simple utility function.
	///
	/// ## Example
	/// ```no_run
	/// use stump_core::{Ctx, config::StumpConfig};
	/// use std::sync::Arc;
	///
	/// #[tokio::main]
	/// async fn main() {
	///     let config = StumpConfig::debug();
	///
	///     let ctx = Ctx::new(config).await;
	///     let arced_ctx = ctx.arced();
	///     let ctx_clone = arced_ctx.clone();
	///
	///     assert_eq!(2, Arc::strong_count(&ctx_clone))
	/// }
	/// ```
	pub fn arced(&self) -> Arc<Ctx> {
		Arc::new(self.clone())
	}

	/// Returns the receiver for the `CoreEvent` channel. See [`emit_event`]
	/// for more information and an example usage.
	pub fn get_client_receiver(&self) -> Receiver<CoreEvent> {
		self.event_channel.0.subscribe()
	}

	pub fn get_event_tx(&self) -> Sender<CoreEvent> {
		self.event_channel.0.clone()
	}

	/// Emits a [`CoreEvent`] to the client event channel.
	pub fn emit_event(&self, event: CoreEvent) {
		let _ = self.event_channel.0.send(event);
	}

	/// Sends a [`JobControllerCommand`] to the job controller
	pub fn send_job_controller_command(
		&self,
		command: JobControllerCommand,
	) -> Result<(), SendError<JobControllerCommand>> {
		self.job_controller.push_command(command)
	}

	/// Sends an [`JobControllerCommand::EnqueueJob`] event to the job manager.
	pub fn enqueue_job(
		&self,
		job: Box<dyn Executor>,
	) -> Result<(), SendError<JobControllerCommand>> {
		self.send_job_controller_command(JobControllerCommand::EnqueueJob(job))
	}

	/// Send a [`CoreEvent`] through the event channel to any clients listening
	pub fn send_core_event(&self, event: CoreEvent) {
		if let Err(error) = self.event_channel.0.send(event) {
			tracing::error!(error = ?error, "Failed to send core event");
		} else {
			tracing::trace!("Sent core event");
		}
	}

	/// Retrieves the encryption key from the server configuration
	pub async fn get_encryption_key(&self) -> CoreResult<String> {
		let record = server_config::Entity::find()
			.select_column(server_config::Column::EncryptionKey)
			.one(self.conn.as_ref())
			.await?;

		let encryption_key = record
			.and_then(|config| config.encryption_key)
			.ok_or(CoreError::EncryptionKeyNotSet)?;

		Ok(encryption_key)
	}
}
