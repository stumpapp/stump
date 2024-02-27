use lettre::{
	address::AddressError,
	message::{header::ContentType, Attachment, MultiPart},
	transport::smtp::authentication::Credentials,
	Message, SmtpTransport, Transport,
};
use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{EmailError, EmailResult};

#[derive(Serialize, Deserialize, ToSchema, Type)]
pub enum EmailerSMTPHost {
	Gmail,
	Outlook,
	Custom(String),
}

impl EmailerSMTPHost {
	pub fn as_relay(&self) -> &str {
		match self {
			EmailerSMTPHost::Gmail => "smtp.gmail.com",
			EmailerSMTPHost::Outlook => "smtp.office365.com",
			EmailerSMTPHost::Custom(relay) => relay.as_str(),
		}
	}
}

impl From<String> for EmailerSMTPHost {
	fn from(relay: String) -> Self {
		match relay.as_str() {
			"smtp.gmail.com" => EmailerSMTPHost::Gmail,
			"smtp.office365.com" => EmailerSMTPHost::Outlook,
			_ => EmailerSMTPHost::Custom(relay),
		}
	}
}

#[derive(Serialize, Deserialize, ToSchema, Type)]
pub struct EmailerClientConfig {
	/// The email address to send from
	pub sender_email: String,
	/// The display name to use for the sender
	pub sender_display_name: String,
	/// The plaintext password to use for the SMTP server, which will be encrypted before being stored
	pub password: String,
	/// The SMTP host to use
	pub host: EmailerSMTPHost,
	/// The SMTP port to use
	pub port: u16,
	/// Whether to use SSL
	pub enable_ssl: bool,
}

pub struct EmailerClient {
	config: EmailerClientConfig,
}

impl EmailerClient {
	pub fn new(config: EmailerClientConfig) -> Self {
		Self { config }
	}

	pub async fn send_attachment(
		&self,
		subject: &str,
		recipient: &str,
		name: &str,
		content: Vec<u8>,
		content_type: ContentType,
	) -> EmailResult<()> {
		let from = self
			.config
			.sender_email
			.parse()
			.map_err(|e: AddressError| EmailError::InvalidEmail(e.to_string()))?;
		let to = recipient
			.parse()
			.map_err(|e: AddressError| EmailError::InvalidEmail(e.to_string()))?;

		let attachment = Attachment::new(name.to_string()).body(content, content_type);
		let email = Message::builder()
			.from(from)
			.to(to)
			.subject(subject)
			.multipart(
				MultiPart::mixed()
					// .singlepart(
					// 	SinglePart::builder()
					// 		.header(header::ContentType::TEXT_PLAIN)
					// 		.body(String::from(message)),
					// )
					.singlepart(attachment),
			)?;

		let creds = Credentials::new(
			self.config.sender_email.clone(),
			self.config.password.clone(),
		);

		let transport = SmtpTransport::relay(self.config.host.as_relay())?
			.port(self.config.port)
			// .secure(self.config.enable_ssl) // TODO: figure this out
			.credentials(creds)
			.build();

		match transport.send(&email) {
			Ok(res) => {
				tracing::trace!(?res, "Email with attachment was sent");
				Ok(())
			},
			Err(e) => {
				tracing::error!(error = ?e, "Failed to send email with attachment");
				Err(e.into())
			},
		}
	}
}
