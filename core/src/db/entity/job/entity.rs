use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{
	db::entity::{Cursor, Log},
	filesystem::{
		image::ThumbnailGenerationOutput,
		scanner::{LibraryScanOutput, SeriesScanOutput},
	},
	job::JobStatus,
	prisma::job,
};

// TODO: There are a couple jobs defined in the server, which obviously presents a problem with
// this type. For now, I'll do some type gymnastics to make it work, but it's not ideal and
// should be fixed. In the meantime, this type represents a generic object
pub type ExternalJobOutput = serde_json::Value;

/// An enum which represents the possible outputs of a job in the Stump core
#[derive(Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
#[serde(untagged)]
pub enum CoreJobOutput {
	LibraryScan(LibraryScanOutput),
	SeriesScan(SeriesScanOutput),
	ThumbnailGeneration(ThumbnailGenerationOutput),
	External(ExternalJobOutput),
}

#[derive(Clone, Serialize, Deserialize, ToSchema, Type)]
pub struct PersistedJob {
	/// The unique identifier of the job
	pub id: String,
	/// The name of the job
	pub name: String,
	/// The description of the job, if any
	pub description: Option<String>,
	/// The status of the job
	pub status: JobStatus,
	/// The output of the job, if any
	pub output_data: Option<CoreJobOutput>,
	/// The duration of the job in milliseconds
	pub ms_elapsed: i64,
	// TODO(specta): replace with DateTime<FixedOffset>
	/// The timestamp of when the job was created
	pub created_at: String,
	/// The timestamp of when the job was completed, if any
	pub completed_at: Option<String>,

	/// The persisted logs associated with this job, if any
	#[serde(skip_serializing_if = "Option::is_none")]
	pub logs: Option<Vec<Log>>,
}

impl Cursor for PersistedJob {
	fn cursor(&self) -> String {
		self.id.clone()
	}
}

impl From<job::Data> for PersistedJob {
	fn from(job: job::Data) -> Self {
		let logs = job.logs().ok().map(|logs| {
			logs.iter()
				.map(|log| Log::from(log.to_owned()))
				.collect::<Vec<Log>>()
		});
		let output_data = job.output_data.as_deref().and_then(|data| {
			serde_json::from_slice(data).map_or_else(
				|error| {
					tracing::error!(?error, "Failed to deserialize job output data");
					None
				},
				Some,
			)
		});

		Self {
			id: job.id,
			name: job.name,
			description: job.description,
			status: job.status.into(),
			output_data,
			ms_elapsed: job.ms_elapsed,
			created_at: job.created_at.to_rfc3339(),
			completed_at: job.completed_at.map(|d| d.to_rfc3339()),
			logs,
		}
	}
}
