use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use super::{JobStatus, WorkerSend, WorkerSendExt};

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
	pub status: Option<JobStatus>,
	/// The message to display
	pub message: Option<String>,

	/// The current task being worked on
	pub current_task_index: Option<i32>,
	/// The number of tasks for the job. This number can change as
	/// subtasks get added/converted to tasks
	pub task_queue_size: Option<i32>,

	/// The current subtask being worked on
	pub current_subtask_index: Option<i32>,
	/// The number of subtasks that exist in the current task
	pub subtask_queue_size: Option<i32>,
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

	/// Constructs a new JobProgress with the given queue position and size
	pub fn task_position(index: i32, size: i32) -> Self {
		Self {
			current_task_index: Some(index),
			task_queue_size: Some(size),
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
			current_subtask_index: Some(index),
			subtask_queue_size: Some(size),
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
	fn into_send(self) -> WorkerSend {
		WorkerSend::Progress(self)
	}
}
