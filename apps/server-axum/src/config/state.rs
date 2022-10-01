use std::sync::Arc;

use async_session::MemoryStore;
use axum::Extension;
use stump_core::{config::Ctx, StumpCore};

pub type State = Extension<Arc<Ctx>>;

pub struct ServerState {
	pub core: StumpCore,
	pub session_store: MemoryStore,
}

impl ServerState {
	pub fn new(core: StumpCore) -> Self {
		Self {
			core,
			session_store: MemoryStore::new(),
		}
	}

	pub fn get_context(&self) -> Ctx {
		self.core.get_context()
	}

	pub fn arced(self) -> Arc<ServerState> {
		Arc::new(self)
	}
}
