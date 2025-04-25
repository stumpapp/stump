use crate::data::{CoreContext, RequestContext};
use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use models::entity::notifier;
use sea_orm::prelude::*;
use serde::{Deserialize, Serialize};

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
	pub async fn config(&self, _ctx: &Context<'_>) -> Result<notifier::NotifierConfig> {
		Ok(notifier::NotifierConfig::from_bytes(&self.model.config)?)
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::tests::common::*;
}
