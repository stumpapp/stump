use serde::{Deserialize, Serialize};

use crate::{
	job::{
		error::JobError, JobExt, JobOutputExt, JobTaskOutput, WorkerCtx, WorkingState,
	},
	prisma,
};
use metadata_sources::{MetadataOutput, MetadataSourceInput};

#[derive(Debug, Serialize, Deserialize)]
pub enum DownloadMetadataTask {
	DownloadMetadataFromSource {
		name: String,
		config: Option<String>,
	},
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct DownloadMetadataOutput {
	source_outputs: Vec<(String, Vec<MetadataOutput>)>,
}

impl JobOutputExt for DownloadMetadataOutput {
	fn update(&mut self, updated: Self) {
		self.source_outputs.extend(updated.source_outputs);
	}
}

#[derive(Debug, Clone)]
pub struct DownloadMetadataJob {
	metadata_input: MetadataSourceInput,
}

#[async_trait::async_trait]
impl JobExt for DownloadMetadataJob {
	const NAME: &'static str = "download_metadata";

	type Output = DownloadMetadataOutput;
	type Task = DownloadMetadataTask;

	fn description(&self) -> Option<String> {
		let input_title = match &self.metadata_input.title {
			Some(title) => title,
			None => &"<untitled>".to_string(),
		};

		Some(format!("Download metadata for {input_title}"))
	}

	async fn init(
		&mut self,
		ctx: &WorkerCtx,
	) -> Result<WorkingState<Self::Output, Self::Task>, JobError> {
		let tasks = ctx
			.db
			.metadata_sources()
			.find_many(vec![prisma::metadata_sources::enabled::equals(true)])
			.exec()
			.await?
			.into_iter()
			.map(|source| DownloadMetadataTask::DownloadMetadataFromSource {
				name: source.name,
				config: source.config,
			});

		Ok(WorkingState {
			output: Some(Self::Output::default()),
			tasks: tasks.collect(),
			completed_tasks: 0,
			logs: vec![],
		})
	}

	async fn execute_task(
		&self,
		_: &WorkerCtx,
		task: Self::Task,
	) -> Result<JobTaskOutput<Self>, JobError> {
		let mut output = Self::Output::default();

		match task {
			DownloadMetadataTask::DownloadMetadataFromSource { name, config } => {
				let metadata_source = metadata_sources::get_source_by_name(&name)
					.map_err(|e| {
						JobError::TaskFailed(format!("Failed to get source {name}: {e}"))
					})?;

				let source_output = metadata_source
					.get_metadata(&self.metadata_input, &config)
					.await
					.unwrap_or(vec![]);

				output.source_outputs = vec![(name, source_output)];
			},
		}

		Ok(JobTaskOutput {
			output,
			subtasks: vec![],
			logs: vec![],
		})
	}
}
