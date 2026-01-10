use crate::{
	data::{AuthContext, CoreContext},
	guard::PermissionGuard,
	input::emailer::{EmailerInput, EmailerSendTo, SendAttachmentEmailsInput},
	object::emailer::Emailer,
};
use async_graphql::{Context, Object, Result, SimpleObject};
use models::{entity::emailer, shared::enums::UserPermission};
use sea_orm::{prelude::*, Set, TryIntoModel};

use super::sender;

#[derive(Default)]
pub struct EmailerMutation;

#[derive(SimpleObject)]
pub struct SendAttachmentEmailOutput {
	pub sent_count: usize,
	pub errors: Vec<String>,
}

#[Object]
impl EmailerMutation {
	#[graphql(guard = "PermissionGuard::one(UserPermission::EmailerCreate)")]
	async fn create_emailer(
		&self,
		ctx: &Context<'_>,
		input: EmailerInput,
	) -> Result<Emailer> {
		let core_ctx = ctx.data::<CoreContext>()?;
		let conn = core_ctx.conn.as_ref();
		let encryption_key = core_ctx.get_encryption_key().await?;

		let emailer = input.try_into_active_model(&encryption_key).await?;
		let result = emailer.save(conn).await?.try_into_model()?;

		Ok(Emailer::from(result))
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::EmailerCreate)")]
	async fn update_emailer(
		&self,
		ctx: &Context<'_>,
		id: i32,
		input: EmailerInput,
	) -> Result<Emailer> {
		let core_ctx = ctx.data::<CoreContext>()?;
		let conn = core_ctx.conn.as_ref();
		let encryption_key = core_ctx.get_encryption_key().await?;

		let mut emailer = input.try_into_active_model(&encryption_key).await?;
		emailer.id = Set(id);
		let result = emailer.save(conn).await?.try_into_model()?;

		Ok(Emailer::from(result))
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::EmailerManage)")]
	async fn delete_emailer(&self, ctx: &Context<'_>, id: i32) -> Result<Emailer> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let model = emailer::Entity::delete_by_id(id)
			.exec_with_returning(conn)
			.await?
			.first()
			.ok_or("Failed to delete emailer".to_string())?
			.clone();
		Ok(Emailer::from(model))
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::EmailSend)")]
	async fn send_attachment_email(
		&self,
		ctx: &Context<'_>,
		input: SendAttachmentEmailsInput,
	) -> Result<SendAttachmentEmailOutput> {
		let core_ctx = ctx.data::<CoreContext>()?;
		let req_ctx = ctx.data::<AuthContext>()?;
		let conn = core_ctx.conn.as_ref();
		let encryption_key = core_ctx.get_encryption_key().await?;
		let templates_dir = core_ctx.config.get_templates_dir();

		validate_send_permissions(req_ctx, &input.send_to)?;
		let result = sender::send_attachment_email(
			conn,
			&req_ctx.user,
			encryption_key,
			templates_dir,
			input,
		)
		.await?;

		Ok(SendAttachmentEmailOutput {
			sent_count: result.0,
			errors: result.1,
		})
	}
}

fn validate_send_permissions(
	req_ctx: &AuthContext,
	send_to: &[EmailerSendTo],
) -> Result<()> {
	let is_sending_to_anonymous = send_to
		.iter()
		.any(|send_to| matches!(send_to, EmailerSendTo::Anonymous { .. }));

	if is_sending_to_anonymous {
		req_ctx.enforce_permissions(&[UserPermission::EmailArbitrarySend])?;
	}

	Ok(())
}
