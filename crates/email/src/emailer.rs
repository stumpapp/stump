use std::path::PathBuf;

use lettre::{
	address::AddressError,
	message::{
		header::{self, ContentType},
		Attachment, MultiPart, SinglePart,
	},
	transport::smtp::authentication::Credentials,
	Message, SmtpTransport, Transport,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use specta::Type;
use utoipa::ToSchema;

use crate::{render_template, EmailError, EmailResult, EmailTemplate};
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
	/// Whether to use TLS for the SMTP connection
	pub tls_enabled: bool,
	/// The maximum size of an attachment in bytes
	pub max_attachment_size_bytes: Option<i32>,
	/// The maximum number of attachments that can be sent in a single email
	pub max_num_attachments: Option<i32>,
}

#[derive(Debug)]
pub struct AttachmentPayload {
	pub name: String,
	pub content: Vec<u8>,
	pub content_type: ContentType,
}

/// A client for sending emails
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
		payload: AttachmentPayload,
	) -> EmailResult<()> {
		self.send_attachments(subject, recipient, vec![payload])
			.await
	}

	pub async fn send_attachments(
		&self,
		subject: &str,
		recipient: &str,
		payloads: Vec<AttachmentPayload>,
	) -> EmailResult<()> {
		let from = self
			.config
			.sender_email
			.parse()
			.map_err(|e: AddressError| EmailError::InvalidEmail(e.to_string()))?;

		let to = recipient
			.parse()
			.map_err(|e: AddressError| EmailError::InvalidEmail(e.to_string()))?;

		let html = render_template(
			EmailTemplate::Attachment,
			&json!({
				"title": "Stump Attachment",
			}),
			self.template_dir.clone(),
		)?;

		let mut multipart_builder = MultiPart::mixed().singlepart(
			SinglePart::builder()
				.header(header::ContentType::TEXT_HTML)
				.body(html),
		);

		for payload in payloads {
			let attachment =
				Attachment::new(payload.name).body(payload.content, payload.content_type);
			multipart_builder = multipart_builder.singlepart(attachment);
		}

		let email = Message::builder()
			.from(from)
			.to(to)
			.subject(subject)
			.multipart(multipart_builder)?;

		let creds =
			Credentials::new(self.config.username.clone(), self.config.password.clone());

		// Note this issue: https://github.com/lettre/lettre/issues/359
		let transport = if self.config.tls_enabled {
			SmtpTransport::starttls_relay(&self.config.host)
				.unwrap()
				.credentials(creds)
				.build()
		} else {
			SmtpTransport::relay(&self.config.host)?
				.port(self.config.port)
				.credentials(creds)
				.build()
		};

		match transport.send(&email) {
			Ok(res) => {
				tracing::trace!(?res, "Email with attachments was sent");
				Ok(())
			},
			Err(e) => {
				tracing::error!(error = ?e, "Failed to send email with attachments");
				Err(e.into())
			},
		}
	}
}
