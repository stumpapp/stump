use async_graphql::{ComplexObject, SimpleObject};
use models::entity::{reading_session, reading_session::DeviceIds};

#[derive(Debug, Clone, SimpleObject)]
#[graphql(complex, name = "ReadingSession")]
pub struct ReadingSession {
	#[graphql(flatten)]
	pub model: reading_session::Model,
}

#[ComplexObject]
impl ReadingSession {
	async fn device_ids(&self) -> Vec<String> {
		self.model
			.device_ids
			.as_ref()
			.map(|DeviceIds(ids)| ids.clone())
			.unwrap_or_default()
	}

	// TODO: async fn devices(&self, ctx: &Context<'_>) -> Result<Vec<RegisteredReadingDevice>>
}

impl From<reading_session::Model> for ReadingSession {
	fn from(model: reading_session::Model) -> Self {
		Self { model }
	}
}
