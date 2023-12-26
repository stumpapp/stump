use async_trait::async_trait;

use crate::{
	db::entity::LibraryScanMode,
	job__::{worker::WorkerContext, StatefulJob},
};

pub struct LibraryScanJob {
	pub library_path: String,
	pub scan_mode: LibraryScanMode,
}

#[async_trait]
impl StatefulJob for LibraryScanJob {
	fn name(&self) -> &'static str {
		"Scan Library"
	}

	async fn load_state(&mut self, ctx: &WorkerContext) {
		todo!()
	}

	async fn save_state(&self, ctx: &WorkerContext) {
		todo!()
	}

	async fn do_work(&mut self, ctx: &WorkerContext) {}

	fn get_progress(&self) -> f64 {
		todo!()
	}
}

impl LibraryScanJob {
	pub fn new(library_path: String, scan_mode: LibraryScanMode) -> Self {
		Self {
			library_path,
			scan_mode,
		}
	}
}
