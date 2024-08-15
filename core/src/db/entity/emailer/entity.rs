use email::{EmailerClient, EmailerClientConfig};
use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{
	prisma::emailer,
	utils::{decrypt_string, encrypt_string},
	CoreError, CoreResult, Ctx,
};

/// The config for an SMTP emailer
#[derive(Serialize, Deserialize, ToSchema, Type)]
pub struct EmailerConfig {
	/// The email address to send from
	pub sender_email: String,
	/// The display name to use for the sender
	pub sender_display_name: String,
	/// The username to use for the SMTP server, typically the same as the sender email
	pub username: String,
	/// The encrypted password to use for the SMTP server
	#[serde(skip_serializing)]
	pub encrypted_password: String,
	/// The SMTP host to use
	pub smtp_host: String,
	/// The SMTP port to use
	pub smtp_port: u16,
	/// Whether to use TLS for the SMTP connection
	pub tls_enabled: bool,
	/// The maximum size of an attachment in bytes
	pub max_attachment_size_bytes: Option<i32>,
	/// The maximum number of attachments that can be sent in a single email
	pub max_num_attachments: Option<i32>,
}

impl EmailerConfig {
	/// Convert the config into a client config, which is used for the actual sending of emails
	pub async fn into_client_config(self, ctx: &Ctx) -> CoreResult<EmailerClientConfig> {
		let encryption_key = ctx.get_encryption_key().await?;
		let password = decrypt_string(&self.encrypted_password, &encryption_key)?;
		Ok(EmailerClientConfig {
			sender_email: self.sender_email,
			sender_display_name: self.sender_display_name,
			username: self.username,
			password,
			host: self.smtp_host,
			port: self.smtp_port,
			tls_enabled: self.tls_enabled,
			max_attachment_size_bytes: self.max_attachment_size_bytes,
			max_num_attachments: self.max_num_attachments,
		})
	}

	pub async fn from_client_config(
		config: EmailerClientConfig,
		ctx: &Ctx,
	) -> CoreResult<Self> {
		let encryption_key = ctx.get_encryption_key().await?;
		let encrypted_password = encrypt_string(&config.password, &encryption_key)?;
		Ok(EmailerConfig {
			sender_email: config.sender_email,
			sender_display_name: config.sender_display_name,
			username: config.username,
			encrypted_password,
			smtp_host: config.host,
			smtp_port: config.port,
			tls_enabled: config.tls_enabled,
			max_attachment_size_bytes: config.max_attachment_size_bytes,
			max_num_attachments: config.max_num_attachments,
		})
	}
}

pub type EmailerConfigInput = EmailerClientConfig;

/// An SMTP emailer entity, which stores SMTP configuration data to be used for sending emails.
///
// Stump supports multiple emailers, however for the initial POC of this feature only one emailer
/// will be configurable. This will be expanded in the future.
#[derive(Serialize, Deserialize, ToSchema, Type)]
pub struct SMTPEmailer {
	pub id: i32,
	/// The friendly name for the emailer, used primarily to identify it in the UI
	pub name: String,
	/// Whether the emailer is the primary emailer for the system
	pub is_primary: bool,
	/// The configuration for the emailer
	pub config: EmailerConfig,
	/// The last time the emailer was used
	pub last_used_at: Option<String>,
}

impl SMTPEmailer {
	pub async fn into_client(self, ctx: &Ctx) -> CoreResult<EmailerClient> {
		let config = self.config.into_client_config(ctx).await?;
		let template_dir = ctx.config.get_templates_dir();
		Ok(EmailerClient::new(config, template_dir))
	}
}

#[derive(Serialize, Deserialize, ToSchema, Type)]
#[serde(untagged)]
pub enum EmailerSendTo {
	Device { device_id: i32 },
	Anonymous { email: String },
}

impl TryFrom<emailer::Data> for SMTPEmailer {
	type Error = CoreError;

	fn try_from(data: emailer::Data) -> Result<Self, Self::Error> {
		Ok(SMTPEmailer {
			id: data.id,
			name: data.name,
			is_primary: data.is_primary,
			config: EmailerConfig {
				sender_email: data.sender_email,
				sender_display_name: data.sender_display_name,
				username: data.username,
				encrypted_password: data.encrypted_password,
				smtp_host: data.smtp_host,
				smtp_port: data.smtp_port as u16,
				tls_enabled: data.tls_enabled,
				max_attachment_size_bytes: data.max_attachment_size_bytes,
				max_num_attachments: data.max_num_attachments,
			},
			last_used_at: data.last_used_at.map(|t| t.to_rfc3339()),
		})
	}
}
