use std::sync::Arc;

use rocket::tokio::sync::{
	broadcast::{channel, Receiver, Sender},
	mpsc::{error::SendError, unbounded_channel, UnboundedSender},
};

use crate::{
	db,
	event::{CoreEvent, InternalCoreTask},
	job::Job,
	prisma,
	types::models::log::TentativeLog,
};

type InternalSender = UnboundedSender<InternalCoreTask>;

type ClientChannel = (Sender<CoreEvent>, Receiver<CoreEvent>);

pub struct Ctx {
	pub db: Arc<prisma::PrismaClient>,
	pub internal_sender: Arc<InternalSender>,
	pub response_channel: Arc<ClientChannel>,
}

/// Ctx each request will be provided with.
impl Ctx {
	pub async fn new(internal_sender: InternalSender) -> Ctx {
		Ctx {
			db: Arc::new(db::create_client().await),
			internal_sender: Arc::new(internal_sender),
			response_channel: Arc::new(channel::<CoreEvent>(1024)),
		}
	}

	pub async fn mock() -> Ctx {
		Ctx {
			db: Arc::new(db::create_test_client().await),
			internal_sender: Arc::new(unbounded_channel::<InternalCoreTask>().0),
			response_channel: Arc::new(channel::<CoreEvent>(1024)),
		}
	}

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

	/// Returns the reciever for the CoreEvent channel. Used in the SSE listener endpoint.
	pub fn get_client_receiver(&self) -> Receiver<CoreEvent> {
		self.response_channel.0.subscribe()
	}

	// FIXME: error handling??
	pub fn emit_client_event(&self, event: CoreEvent) {
		let _ = self.response_channel.0.send(event);
	}

	/// Emits a client event and persists a log based on the failure.
	pub async fn handle_failure_event(&self, event: CoreEvent) {
		use prisma::log;

		// TODO: maybe log::error! here?

		self.emit_client_event(event.clone());

		let tentative_log = TentativeLog::from(event);

		// FIXME: error handling here...
		let _ = self
			.db
			.log()
			.create(
				tentative_log.message,
				vec![
					log::job_id::set(tentative_log.job_id),
					log::level::set(tentative_log.level.to_string()),
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
