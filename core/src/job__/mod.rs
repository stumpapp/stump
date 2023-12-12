mod error;
mod manager;

#[async_trait::async_trait]
pub trait StatefulJob: Send {
	/// The name of the job being implemented
	fn name(&self) -> &'static str;

	/// Do an increment of work
	async fn do_work(&self);

	///
	async fn get_progress(&self) -> f64;
}
