use rocket::tokio::{self, sync::mpsc::UnboundedReceiver};

use crate::{
	config::context::Context,
	job::jobs::Jobs,
	types::event::{InternalEvent, InternalTask, TaskResponder, TaskResponse},
};

type EventReceiver = UnboundedReceiver<InternalEvent>;
type TaskReceiver = UnboundedReceiver<TaskResponder<InternalTask>>;

pub struct EventManager {
	ctx: Context,
	jobs: Jobs,
}

impl EventManager {
	pub fn new(ctx: Context) -> EventManager {
		EventManager {
			ctx,
			jobs: Jobs::new(),
		}
	}

	async fn handle_event(&mut self, event: InternalEvent) {
		match event {
			InternalEvent::QueueJob(job) => {
				// TODO: queue the job, don't run it immediately
				// TODO: don't block the thread
				job.run(self.ctx.get_ctx()).await.unwrap_or(());
				// self.jobs.enqueue(job, &self.ctx);
			},
			InternalEvent::JobComplete(id) => {
				println!("JobComplete: {:?}", id);
			},
		}
	}

	// TODO: error handling
	async fn handle_task(&self, task: TaskResponder<InternalTask>) {
		let res = match task.task {
			InternalTask::GetRunningJob => {
				Ok(TaskResponse::GetRunningJob("Just a test".to_string()))
			},
			InternalTask::GetQueuedJobs => {
				Ok(TaskResponse::GetQueuedJobs("Just a test".to_string()))
			},
		};

		task.return_sender.send(res).unwrap();
	}

	pub async fn run(&mut self, e_rx: EventReceiver, t_rx: TaskReceiver) {
		let mut e_rx = e_rx;
		let mut t_rx = t_rx;

		loop {
			tokio::select! {
				Some(task) = t_rx.recv() => {
					self.handle_task(task).await;
				}
				Some(event) = e_rx.recv() => {
					self.handle_event(event).await;
				}
			}
		}
	}
}
