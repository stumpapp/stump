use async_graphql::{ComplexObject, SimpleObject};
use models::entity::{reading_session_v2, reading_session_v2::DeviceIds};

#[derive(Debug, Clone, SimpleObject)]
#[graphql(complex, name = "ReadingSession")]
pub struct ReadingSession {
	#[graphql(flatten)]
	pub model: reading_session_v2::Model,
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

impl From<reading_session_v2::Model> for ReadingSession {
	fn from(model: reading_session_v2::Model) -> Self {
		Self { model }
	}
}
