use email::{EmailerClientConfig, EmailerSMTPHost};
use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{
	prisma::emailer,
	utils::{decrypt_string, encrypt_string},
	CoreResult, Ctx,
};

/// The config for an SMTP emailer
#[derive(Serialize, Deserialize, ToSchema, Type)]
pub struct EmailerConfig {
	/// The email address to send from
	pub sender_email: String,
	/// The display name to use for the sender
	pub sender_display_name: String,
	/// The encrypted password to use for the SMTP server
	pub encrypted_password: String,
	/// The SMTP host to use
	pub smtp_host: EmailerSMTPHost,
	/// The SMTP port to use
	pub smtp_port: u16,
	/// Whether to use SSL
	pub enable_ssl: bool,
}

impl EmailerConfig {
	/// Convert the config into a client config, which is used for the actual sending of emails
	pub async fn into_client_config(self, ctx: &Ctx) -> CoreResult<EmailerClientConfig> {
		let password = decrypt_string(&self.encrypted_password, ctx).await?;
		Ok(EmailerClientConfig {
			sender_email: self.sender_email,
			sender_display_name: self.sender_display_name,
			password,
			host: self.smtp_host,
			port: self.smtp_port,
			enable_ssl: self.enable_ssl,
		})
	}

	pub async fn from_client_config(
		config: EmailerClientConfig,
		ctx: &Ctx,
	) -> CoreResult<Self> {
		let encrypted_password = encrypt_string(&config.password, ctx).await?;
		Ok(EmailerConfig {
			sender_email: config.sender_email,
			sender_display_name: config.sender_display_name,
			encrypted_password,
			smtp_host: config.host,
			smtp_port: config.port,
			enable_ssl: config.enable_ssl,
		})
	}
}

/// An SMTP emailer entity, which stores SMTP configuration data to be used for sending emails.
///
// Stump supports multiple emailers, however for the initial POC of this feature only one emailer
/// will be configurable. This will be expanded in the future.
#[derive(Serialize, Deserialize, ToSchema, Type)]
pub struct SMTPEmailer {
	pub id: i32,
	pub name: String,
	pub config: EmailerConfig,
}

impl From<emailer::Data> for SMTPEmailer {
	fn from(data: emailer::Data) -> Self {
		SMTPEmailer {
			id: data.id,
			name: data.name,
			config: EmailerConfig {
				sender_email: data.sender_email,
				sender_display_name: data.sender_display_name,
				encrypted_password: data.encrypted_password,
				smtp_host: EmailerSMTPHost::from(data.smtp_host),
				smtp_port: data.smtp_port as u16,
				enable_ssl: data.smtp_secure,
			},
		}
	}
}
