use std::sync::Arc;

use tokio::sync::{
	broadcast::{channel, Receiver, Sender},
	mpsc::error::SendError,
};

use crate::{
	config::StumpConfig,
	db,
	event::CoreEvent,
	job::{Executor, JobController, JobControllerCommand},
	prisma,
};

type EventChannel = (Sender<CoreEvent>, Receiver<CoreEvent>);

/// Struct that holds the main context for a Stump application. This is passed around
/// to all the different parts of the application, and is used to access the database
/// and manage the event channels.
#[derive(Clone)]
pub struct Ctx {
	pub config: Arc<StumpConfig>,
	pub db: Arc<prisma::PrismaClient>,
	pub job_controller: Arc<JobController>,
	pub event_channel: Arc<EventChannel>,
}

impl Ctx {
	/// Creates a new [Ctx] instance, creating a new prisma client. This should only be called
	/// once per application. It takes a sender for the internal event channel, so the
	/// core can send events to the consumer.
	///
	/// ## Example
	/// ```rust
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
		let db = Arc::new(db::create_client(&config).await);
		let event_channel = Arc::new(channel::<CoreEvent>(1024));

		let job_controller =
			JobController::new(db.clone(), config.clone(), event_channel.0.clone());

		Ctx {
			config,
			db,
			job_controller,
			event_channel,
		}
	}

	/// Creates a [Ctx] instance for testing **only**. The prisma client is created
	/// pointing to the `integration-tests` crate relative to the `core` crate.
	///
	/// **This should not be used in production.**
	pub async fn mock() -> Ctx {
		let config = Arc::new(StumpConfig::debug());
		let db = Arc::new(db::create_test_client().await);
		let event_channel = Arc::new(channel::<CoreEvent>(1024));

		// Create job manager
		let job_controller =
			JobController::new(db.clone(), config.clone(), event_channel.0.clone());

		Ctx {
			config,
			db,
			job_controller,
			event_channel,
		}
	}

	/// Wraps the [Ctx] in an [Arc], allowing it to be shared across threads. This
	/// is just a simple utility function.
	///
	/// ## Example
	/// ```rust
	/// use stump_core::{Ctx, config::StumpConfig};
	/// use tokio::sync::mpsc::unbounded_channel;
	/// use std::sync::Arc;
	///
	/// #[tokio::main]
	/// async fn main() {
	///     let (sender, _) = unbounded_channel();
	///     let config = StumpConfig::debug();
	///
	///     let ctx = Ctx::new(config, sender).await;
	///     let arced_ctx = ctx.arced();
	///     let ctx_clone = arced_ctx.clone();
	///
	///     assert_eq!(2, Arc::strong_count(&ctx_clone))
	/// }
	/// ```
	pub fn arced(&self) -> Arc<Ctx> {
		Arc::new(self.clone())
	}

	/// Returns the reciever for the CoreEvent channel. See [`emit_event`]
	/// for more information and an example usage.
	pub fn get_client_receiver(&self) -> Receiver<CoreEvent> {
		self.event_channel.0.subscribe()
	}

	pub fn get_event_tx(&self) -> Sender<CoreEvent> {
		self.event_channel.0.clone()
	}

	/// Emits a [CoreEvent] to the client event channel.
	///
	/// ## Example
	/// ```rust
	/// use stump_core::{Ctx, config::StumpConfig, event::CoreEvent};
	/// use tokio::sync::mpsc::unbounded_channel;
	///
	/// #[tokio::main]
	/// async fn main() {
	///    let (sender, _) = unbounded_channel();
	///    let config = StumpConfig::debug();
	///    let ctx = Ctx::new(config, sender).await;
	///
	///    let event = CoreEvent::JobFailed {
	///        job_id: "Gandalf quote".to_string(),
	///        message: "When in doubt, follow your nose".to_string(),
	///    };
	///
	///    let ctx_cpy = ctx.clone();
	///    tokio::spawn(async move {
	///        let mut receiver = ctx_cpy.get_client_receiver();
	///        let received_event = receiver.recv().await;
	///        assert_eq!(received_event.is_ok(), true);
	///        match received_event.unwrap() {
	///            CoreEvent::JobFailed { job_id, message } => {
	///                assert_eq!(job_id, "Gandalf quote");
	///                assert_eq!(message, "When in doubt, follow your nose");
	///            }
	///            _ => unreachable!("Wrong event type received"),
	///        }
	///    });
	///
	///    ctx.emit_event(event.clone());
	/// }
	/// ```
	pub fn emit_event(&self, event: CoreEvent) {
		let _ = self.event_channel.0.send(event);
	}

	/// Sends a [JobControllerCommand] to the job controller
	pub fn send_job_controller_command(
		&self,
		command: JobControllerCommand,
	) -> Result<(), SendError<JobControllerCommand>> {
		self.job_controller.push_command(command)
	}

	/// Sends an EnqueueJob event to the job manager.
	pub fn enqueue_job(
		&self,
		job: Box<dyn Executor>,
	) -> Result<(), SendError<JobControllerCommand>> {
		self.send_job_controller_command(JobControllerCommand::EnqueueJob(job))
	}

	/// Send a [CoreEvent] through the event channel to any clients listening
	pub fn send_core_event(&self, event: CoreEvent) {
		if let Err(error) = self.event_channel.0.send(event) {
			tracing::error!(error = ?error, "Failed to send core event");
		} else {
			tracing::trace!("Sent core event");
		}
	}
}
