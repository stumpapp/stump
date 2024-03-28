use std::path::PathBuf;

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
pub struct EmailerClientConfig {
	/// The email address to send from
	pub sender_email: String,
	/// The display name to use for the sender
	pub sender_display_name: String,
	/// The username to use for the SMTP server, typically the same as the sender email
	pub username: String,
	/// The plaintext password to use for the SMTP server, which will be encrypted before being stored
	pub password: String,
	/// The SMTP host to use
	pub host: String,
	/// The SMTP port to use
	pub port: u16,
	/// The maximum size of an attachment in bytes
	pub max_attachment_size_bytes: Option<i32>,
}

pub struct EmailerClient {
	config: EmailerClientConfig,
	template_dir: PathBuf,
}

impl EmailerClient {
	pub fn new(config: EmailerClientConfig, template_dir: PathBuf) -> Self {
		Self {
			config,
			template_dir,
		}
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

		// TODO: render_template

		let attachment = Attachment::new(name.to_string()).body(content, content_type);
		let email = Message::builder()
			.from(from)
			.to(to)
			.subject(subject)
			.multipart(
				MultiPart::mixed()
					// .singlepart(
					// 	SinglePart::builder()
					// 		.header(header::ContentType::TEXT_HTML)
					// 		.body(String::from(html)),
					// )
					.singlepart(attachment),
			)?;

		let creds =
			Credentials::new(self.config.username.clone(), self.config.password.clone());

		// https://github.com/lettre/lettre/issues/359

		let transport = SmtpTransport::relay(&self.config.host)?
			.port(self.config.port)
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
