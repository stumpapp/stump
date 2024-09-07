use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use super::{JobStatus, WorkerSend, WorkerSendExt};

/// An update event that is emitted by a job
#[derive(Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct JobUpdate {
	pub id: String,
	#[serde(flatten)]
	pub payload: JobProgress,
}

/// A struct that represents a progress event that is emitted by a job. This behaves like a patch,
/// where the client will ignore any fields that are not present. This is done so all internal ops
/// can be done without needing to know the full state of the job.
#[derive(Debug, Clone, Default, Deserialize, Serialize, Type, ToSchema)]
pub struct JobProgress {
	/// The status of the job
	#[specta(optional)]
	pub status: Option<JobStatus>,
	/// The message to display
	#[specta(optional)]
	pub message: Option<String>,

	/// The current task being worked on
	#[specta(optional)]
	pub completed_tasks: Option<i32>,
	/// The number of tasks for the job. This number can change as
	/// subtasks get added/converted to tasks
	#[specta(optional)]
	pub remaining_tasks: Option<i32>,

	/// The current subtask being worked on
	#[specta(optional)]
	pub completed_subtasks: Option<i32>,
	/// The number of subtasks that exist in the current task
	#[specta(optional)]
	pub remaining_subtasks: Option<i32>,
}

impl JobProgress {
	/// Constructs a new JobProgress with the given message
	pub fn msg(msg: &str) -> Self {
		Self {
			message: Some(msg.to_string()),
			..Default::default()
		}
	}

	/// Constructs a new JobProgress with the given status
	pub fn status(status: JobStatus) -> Self {
		Self {
			status: Some(status),
			..Default::default()
		}
	}

	/// Constructs a new JobProgress with the given status and msg
	pub fn status_msg(status: JobStatus, msg: &str) -> Self {
		Self {
			status: Some(status),
			message: Some(msg.to_string()),
			..Default::default()
		}
	}

	/// Constructs a new JobProgress with the status set to `JobStatus::Completed` and the message set to "Job finished"
	pub fn finished() -> Self {
		Self::status_msg(JobStatus::Completed, "Job finished")
	}

	/// Constructs a new JobProgress with the given queue position and size
	pub fn task_position(index: i32, size: i32) -> Self {
		Self {
			completed_tasks: Some(index),
			remaining_tasks: Some(size),
			..Default::default()
		}
	}

	pub fn task_position_msg(msg: &str, index: i32, size: i32) -> Self {
		Self {
			message: Some(msg.to_string()),
			..Self::task_position(index, size)
		}
	}

	pub fn init_done(index: i32, size: i32) -> Self {
		Self::task_position_msg("Job intialized", index, size)
	}

	pub fn restored(index: i32, size: i32) -> Self {
		Self::task_position_msg("Job state restored from database", index, size)
	}

	pub fn subtask_position(index: i32, size: i32) -> Self {
		Self {
			completed_subtasks: Some(index),
			remaining_subtasks: Some(size),
			..Default::default()
		}
	}

	pub fn subtask_position_msg(msg: &str, index: i32, size: i32) -> Self {
		Self {
			message: Some(msg.to_string()),
			..Self::subtask_position(index, size)
		}
	}
}

impl WorkerSendExt for JobProgress {
	fn into_worker_send(self) -> WorkerSend {
		WorkerSend::Progress(self)
	}
}
