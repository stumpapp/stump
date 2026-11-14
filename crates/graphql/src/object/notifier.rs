use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use models::entity::notifier;

use crate::guard::UnreleasedFeatureGuard;

// TODO(notifier): rm the unreleased guard once i _actually_ build it out

#[derive(Debug, Clone, SimpleObject)]
#[graphql(complex)]
pub struct Notifier {
	#[graphql(flatten)]
	pub model: notifier::Model,
}

impl From<notifier::Model> for Notifier {
	fn from(entity: notifier::Model) -> Self {
		Self { model: entity }
	}
}

#[ComplexObject]
impl Notifier {
	#[graphql(guard = "UnreleasedFeatureGuard")]
	pub async fn config(&self, _ctx: &Context<'_>) -> Result<notifier::NotifierConfig> {
		notifier::NotifierConfig::from_bytes(&self.model.config)
	}
}
