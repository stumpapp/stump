use walkdir::WalkDir;

use super::Job;

use crate::{
	config::context::Context,
	fs::scanner::library::LibraryScanner,
	types::{errors::ApiError, event::ClientEvent},
};

#[derive(Debug)]
pub struct LibraryScannerJob {
	pub path: String,
}

#[async_trait::async_trait]
impl Job for LibraryScannerJob {
	async fn run(&self, runner_id: String, ctx: Context) -> Result<(), ApiError> {
		let library = LibraryScanner::precheck(self.path.clone(), &ctx).await?;

		let files_to_process = WalkDir::new(&library.path)
			.into_iter()
			.filter_map(|e| e.ok())
			.count() as u64;

		let _ = ctx.emit_client_event(ClientEvent::job_started(
			runner_id.clone(),
			0,
			files_to_process,
			Some(format!("Starting library scan at {}", &library.path)),
		));

		let mut scanner =
			LibraryScanner::new(library, ctx.get_ctx(), (runner_id, files_to_process));

		scanner.scan_library().await;

		Ok(())
	}
}
