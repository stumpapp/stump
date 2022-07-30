use std::sync::Arc;

use rocket::tokio::sync::{
	broadcast::{channel, Receiver, Sender},
	mpsc::{error::SendError, unbounded_channel, UnboundedSender},
};

use crate::{
	db,
	event::{ClientEvent, ClientRequest},
	job::Job,
	prisma,
};

type InternalSender = UnboundedSender<ClientRequest>;

type ClientChannel = (Sender<ClientEvent>, Receiver<ClientEvent>);

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
			response_channel: Arc::new(channel::<ClientEvent>(1024)),
		}
	}

	pub async fn mock() -> Ctx {
		Ctx {
			db: Arc::new(db::create_client().await),
			internal_sender: Arc::new(unbounded_channel::<ClientRequest>().0),
			// task_sender: Arc::new(unbounded_channel::<TaskResponder<InternalTask>>().0),
			response_channel: Arc::new(channel::<ClientEvent>(1024)),
		}
	}

	pub fn get_db(&self) -> &prisma::PrismaClient {
		&self.db
	}

	pub fn get_ctx(&self) -> Ctx {
		Ctx {
			db: self.db.clone(),
			internal_sender: self.internal_sender.clone(),
			response_channel: self.response_channel.clone(),
		}
	}

	pub fn get_client_receiver(&self) -> Receiver<ClientEvent> {
		self.response_channel.0.subscribe()
	}

	// TODO: error handling??
	pub fn emit_client_event(&self, event: ClientEvent) {
		let _ = self.response_channel.0.send(event);
	}

	pub fn spawn_job(&self, job: Box<dyn Job>) -> Result<(), SendError<ClientRequest>> {
		self.internal_sender.send(ClientRequest::QueueJob(job))
	}
}
