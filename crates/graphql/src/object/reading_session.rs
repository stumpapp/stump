use async_graphql::SimpleObject;
use models::entity::{finished_reading_session, reading_session};

#[derive(Debug, Clone, SimpleObject)]
pub struct ActiveReadingSession {
	#[graphql(flatten)]
	pub model: reading_session::Model,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct FinishedReadingSession {
	#[graphql(flatten)]
	pub model: finished_reading_session::Model,
}

impl From<finished_reading_session::Model> for FinishedReadingSession {
	fn from(entity: finished_reading_session::Model) -> Self {
		Self { model: entity }
	}
}

impl From<reading_session::Model> for ActiveReadingSession {
	fn from(entity: reading_session::Model) -> Self {
		Self { model: entity }
	}
}
