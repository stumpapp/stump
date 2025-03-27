use async_graphql::SimpleObject;

use models::entity::log;

#[derive(Debug, SimpleObject)]
pub struct Log {
	#[graphql(flatten)]
	pub model: log::Model,
}

impl From<log::Model> for Log {
	fn from(entity: log::Model) -> Self {
		Self { model: entity }
	}
}
