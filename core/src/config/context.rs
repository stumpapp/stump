use std::sync::Arc;

use rocket::tokio::sync::{
	broadcast::{channel, error::SendError, Receiver, Sender},
	mpsc::{unbounded_channel, UnboundedSender},
};

use crate::{
	db,
	job::Job,
	prisma,
	types::event::{ClientEvent, InternalEvent, InternalTask, TaskResponder},
};

type EventSender = UnboundedSender<InternalEvent>;
type TaskSender = UnboundedSender<TaskResponder<InternalTask>>;

type ClientChannel = (Sender<ClientEvent>, Receiver<ClientEvent>);

pub struct Ctx {
	pub db: Arc<prisma::PrismaClient>,
	pub event_sender: Arc<EventSender>,
	pub task_sender: Arc<TaskSender>,
	pub client_channel: Arc<ClientChannel>,
}

/// Ctx each request will be provided with.
impl Ctx {
	pub async fn new(event_sender: EventSender, task_sender: TaskSender) -> Ctx {
		Ctx {
			db: Arc::new(db::create_client().await),
			event_sender: Arc::new(event_sender),
			task_sender: Arc::new(task_sender),
			client_channel: Arc::new(channel::<ClientEvent>(1024)),
		}
	}

	pub async fn mock() -> Ctx {
		Ctx {
			db: Arc::new(db::create_client().await),
			event_sender: Arc::new(unbounded_channel::<InternalEvent>().0),
			task_sender: Arc::new(unbounded_channel::<TaskResponder<InternalTask>>().0),
			client_channel: Arc::new(channel::<ClientEvent>(1024)),
		}
	}

	pub fn get_db(&self) -> &prisma::PrismaClient {
		&self.db
	}

	pub fn get_ctx(&self) -> Ctx {
		Ctx {
			db: self.db.clone(),
			event_sender: self.event_sender.clone(),
			task_sender: self.task_sender.clone(),
			client_channel: self.client_channel.clone(),
		}
	}

	pub fn client_receiver(&self) -> Receiver<ClientEvent> {
		self.client_channel.0.subscribe()
	}

	// TODO: error handling
	pub fn emit_task(&self, responder: TaskResponder<InternalTask>) {
		self.task_sender.send(responder).unwrap();
	}

	pub fn emit_event(&self, event: InternalEvent) {
		self.event_sender.send(event).unwrap();
	}

	// TODO: error handling
	pub fn emit_client_event(
		&self,
		event: ClientEvent,
	) -> Result<(), SendError<ClientEvent>> {
		self.client_channel.0.send(event)?;

		Ok(())
	}

	// TODO: error handling
	pub fn spawn_job(&self, job: Box<dyn Job>) {
		self.event_sender
			.send(InternalEvent::QueueJob(job))
			.unwrap();
	}
}
