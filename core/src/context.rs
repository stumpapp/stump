use std::sync::Arc;

use tokio::sync::{
	broadcast::{channel, Receiver, Sender},
	mpsc::{error::SendError, unbounded_channel, UnboundedSender},
};

use crate::{
	db::{self, entity::Log},
	event::{CoreEvent, InternalCoreTask},
	job::Job,
	prisma,
};

type InternalSender = UnboundedSender<InternalCoreTask>;

type ClientChannel = (Sender<CoreEvent>, Receiver<CoreEvent>);

/// Struct that holds the main context for a Stump application. This is passed around
/// to all the different parts of the application, and is used to access the database
/// and manage the event channels.
pub struct Ctx {
	pub db: Arc<prisma::PrismaClient>,
	pub internal_sender: Arc<InternalSender>,
	pub response_channel: Arc<ClientChannel>,
}

impl Clone for Ctx {
	fn clone(&self) -> Ctx {
		self.get_ctx()
	}
}

impl Ctx {
	/// Creates a new [Ctx] instance, creating a new prisma client. This should only be called
	/// once per application. It takes a sender for the internal event channel, so the
	/// core can send events to the consumer.
	///
	/// ## Example
	/// ```rust
	/// use stump_core::config::Ctx;
	/// use tokio::sync::mpsc::unbounded_channel;
	///
	/// #[tokio::main]
	/// async fn main() {
	///    let (sender, _) = unbounded_channel();
	///    let ctx = Ctx::new(sender).await;
	/// }
	/// ```
	pub async fn new(internal_sender: InternalSender) -> Ctx {
		Ctx {
			db: Arc::new(db::create_client().await),
			internal_sender: Arc::new(internal_sender),
			response_channel: Arc::new(channel::<CoreEvent>(1024)),
		}
	}

	/// Creates a [Ctx] instance for testing **only**. The prisma client is created
	/// pointing to the `integration-tests` crate relative to the `core` crate.
	///
	/// **This should not be used in production.**
	pub async fn mock() -> Ctx {
		Ctx {
			db: Arc::new(db::create_test_client().await),
			internal_sender: Arc::new(unbounded_channel::<InternalCoreTask>().0),
			response_channel: Arc::new(channel::<CoreEvent>(1024)),
		}
	}

	/// Wraps the [Ctx] in an [Arc], allowing it to be shared across threads. This
	/// is just a simple utility function.
	///
	/// ## Example
	/// ```rust
	/// use stump_core::config::Ctx;
	/// use tokio::sync::mpsc::unbounded_channel;
	/// use std::sync::Arc;
	///
	/// #[tokio::main]
	/// async fn main() {
	///     let (sender, _) = unbounded_channel();
	///
	///     let ctx = Ctx::new(sender).await;
	///     let arced_ctx = ctx.arced();
	///     let ctx_clone = arced_ctx.clone();
	///
	///     assert_eq!(2, Arc::strong_count(&ctx_clone))
	/// }
	/// ```
	pub fn arced(&self) -> Arc<Ctx> {
		Arc::new(self.get_ctx())
	}

	/// Get reference to prisma client
	pub fn get_db(&self) -> &prisma::PrismaClient {
		&self.db
	}

	/// Returns a copy of the ctx
	pub fn get_ctx(&self) -> Ctx {
		Ctx {
			db: self.db.clone(),
			internal_sender: self.internal_sender.clone(),
			response_channel: self.response_channel.clone(),
		}
	}

	/// Returns the reciever for the CoreEvent channel. See [`emit_client_event`]
	/// for more information and an example usage.
	pub fn get_client_receiver(&self) -> Receiver<CoreEvent> {
		self.response_channel.0.subscribe()
	}

	/// Emits a [CoreEvent] to the client event channel.
	///
	/// ## Example
	/// ```rust
	/// use stump_core::{config::Ctx, event::CoreEvent};
	/// use tokio::sync::mpsc::unbounded_channel;
	///
	/// #[tokio::main]
	/// async fn main() {
	///    let (sender, _) = unbounded_channel();
	///    let ctx = Ctx::new(sender).await;
	///
	///    let event = CoreEvent::JobFailed {
	///        runner_id: "Gandalf quote".to_string(),
	///        message: "When in doubt, follow your nose".to_string(),
	///    };
	///
	///    let ctx_cpy = ctx.clone();
	///    tokio::spawn(async move {
	///        let mut receiver = ctx_cpy.get_client_receiver();
	///        let received_event = receiver.recv().await;
	///        assert_eq!(received_event.is_ok(), true);
	///        match received_event.unwrap() {
	///            CoreEvent::JobFailed { runner_id, message } => {
	///                assert_eq!(runner_id, "Gandalf quote");
	///                assert_eq!(message, "When in doubt, follow your nose");
	///            }
	///            _ => unreachable!("Wrong event type received"),
	///        }
	///    });
	///
	///    ctx.emit_client_event(event.clone());
	/// }
	/// ```
	pub fn emit_client_event(&self, event: CoreEvent) {
		let _ = self.response_channel.0.send(event);
	}

	/// Emits a client event and persists a log based on the failure.
	pub async fn handle_failure_event(&self, event: CoreEvent) {
		use prisma::log;

		self.emit_client_event(event.clone());

		let log = Log::from(event);

		// FIXME: error handling here...
		let _ = self
			.db
			.log()
			.create(
				log.message,
				vec![
					log::job_id::set(log.job_id),
					log::level::set(log.level.to_string()),
				],
			)
			.exec()
			.await;
	}

	/// Sends in internal task
	pub fn internal_task(
		&self,
		task: InternalCoreTask,
	) -> Result<(), SendError<InternalCoreTask>> {
		self.internal_sender.send(task)
	}

	/// Sends a QueueJob task to the event manager.
	pub fn spawn_job(
		&self,
		job: Box<dyn Job>,
	) -> Result<(), SendError<InternalCoreTask>> {
		self.internal_sender.send(InternalCoreTask::QueueJob(job))
	}
}
