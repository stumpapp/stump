use async_graphql::{ComplexObject, Context, Result, SimpleObject};

use models::entity::{emailer_send_record, registered_email_device};
use sea_orm::prelude::*;

use crate::data::CoreContext;

use super::emailer_send_record::EmailerSendRecord;

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct RegisteredEmailDevice {
	#[graphql(flatten)]
	pub model: registered_email_device::Model,
}

impl From<registered_email_device::Model> for RegisteredEmailDevice {
	fn from(entity: registered_email_device::Model) -> Self {
		Self { model: entity }
	}
}

#[ComplexObject]
impl RegisteredEmailDevice {
	async fn send_history(&self, ctx: &Context<'_>) -> Result<Vec<EmailerSendRecord>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let records = emailer_send_record::Entity::find()
			.filter(
				emailer_send_record::Column::RecipientEmail.eq(self.model.email.clone()),
			)
			.all(conn)
			.await?;

		Ok(records.into_iter().map(EmailerSendRecord::from).collect())
	}
}
