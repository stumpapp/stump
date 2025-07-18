use async_graphql::{ComplexObject, Context, Result, SimpleObject};

use models::entity::{emailer, emailer_send_record};
use sea_orm::prelude::*;

use crate::data::CoreContext;

use super::emailer_send_record::EmailerSendRecord;

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct Emailer {
	#[graphql(flatten)]
	pub model: emailer::Model,
}

impl From<emailer::Model> for Emailer {
	fn from(entity: emailer::Model) -> Self {
		Self { model: entity }
	}
}

#[ComplexObject]
impl Emailer {
	async fn send_history(&self, ctx: &Context<'_>) -> Result<Vec<EmailerSendRecord>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let records = emailer_send_record::Entity::find()
			.filter(emailer_send_record::Column::EmailerId.eq(self.model.id))
			.all(conn)
			.await?;

		Ok(records.into_iter().map(EmailerSendRecord::from).collect())
	}
}
