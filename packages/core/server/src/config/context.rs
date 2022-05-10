use std::sync::Arc;

use rocket::tokio::sync::{
	broadcast::{channel, error::SendError, Receiver, Sender},
	mpsc::UnboundedSender,
};

use crate::{
	job::Job,
	prisma,
	types::event::{InternalEvent, InternalTask, TaskResponder},
};

type EventSender = UnboundedSender<InternalEvent>;
type TaskSender = UnboundedSender<TaskResponder<InternalTask>>;

type ClientChannel = (Sender<String>, Receiver<String>);

pub struct Context {
	pub db: Arc<prisma::PrismaClient>,
	pub event_sender: Arc<EventSender>,
	pub task_sender: Arc<TaskSender>,
	pub client_channel: Arc<ClientChannel>,
}

/// Context each request will be provided with.
impl Context {
	pub async fn new(event_sender: EventSender, task_sender: TaskSender) -> Context {
		Context {
			db: Arc::new(
				prisma::new_client()
					.await
					.expect("Failed to create Prisma client"),
			),
			event_sender: Arc::new(event_sender),
			task_sender: Arc::new(task_sender),
			client_channel: Arc::new(channel::<String>(1024)),
		}
	}

	pub fn get_db(&self) -> &prisma::PrismaClient {
		&self.db
	}

	pub fn get_ctx(&self) -> Context {
		Context {
			db: self.db.clone(),
			event_sender: self.event_sender.clone(),
			task_sender: self.task_sender.clone(),
			client_channel: self.client_channel.clone(),
		}
	}

	pub fn client_receiver(&self) -> Receiver<String> {
		self.client_channel.0.subscribe()
	}

	// TODO: error handling
	pub fn emit_task(&self, responder: TaskResponder<InternalTask>) {
		self.task_sender.send(responder).unwrap();
	}

	// TODO: error handling
	pub fn emit_client_event(
		&self,
		event: String,
	) -> Result<(), SendError<std::string::String>> {
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
