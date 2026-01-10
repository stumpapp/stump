use async_graphql::{InputObject, OneofObject, Result, ID};
use email::EmailerClientConfig;
use models::entity::emailer;
use sea_orm::{ActiveValue::NotSet, Set};
use stump_core::utils::encryption::encrypt_string;

/// Input object for creating or updating an emailer
#[derive(InputObject)]
pub struct EmailerInput {
	/// The friendly name of the emailer, e.g. "Aaron's Kobo"
	name: String,

	/// Whether the emailer is the primary emailer
	pub is_primary: bool,

	/// The emailer configuration
	pub config: EmailerClientConfig,
}

impl EmailerInput {
	/// Converts the input object into an active model for database operations
	pub async fn try_into_active_model(
		self,
		encryption_key: &String,
	) -> Result<emailer::ActiveModel> {
		let encrypted_password = encrypt_string(
			&self.config.password.ok_or("Password is missing")?,
			encryption_key,
		)?;

		Ok(emailer::ActiveModel {
			id: NotSet, // auto-incremented
			name: Set(self.name),
			is_primary: Set(self.is_primary),
			sender_email: Set(self.config.sender_email),
			sender_display_name: Set(self.config.sender_display_name),
			username: Set(self.config.username),
			encrypted_password: Set(encrypted_password),
			smtp_host: Set(self.config.host),
			smtp_port: Set(self.config.port.into()),
			tls_enabled: Set(self.config.tls_enabled),
			max_attachment_size_bytes: Set(self.config.max_attachment_size_bytes),
			max_num_attachments: Set(self.config.max_num_attachments),
			last_used_at: Set(None),
		})
	}
}

#[derive(InputObject)]
pub struct SendToDevice {
	pub id: i32,
}

#[derive(InputObject)]
pub struct SendToEmail {
	pub email: String,
}

#[derive(OneofObject)]
pub enum EmailerSendTo {
	Device(SendToDevice),
	Anonymous(SendToEmail),
}

#[derive(InputObject)]
pub struct SendAttachmentEmailsInput {
	pub media_ids: Vec<ID>,
	pub send_to: Vec<EmailerSendTo>,
}
