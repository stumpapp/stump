use async_graphql::InputObject;
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

use crate::{render_template, EmailError, EmailResult, EmailTemplate};

/// The configuration for an [EmailerClient]
#[derive(Serialize, Deserialize, InputObject)]
pub struct EmailerClientConfig {
	/// The email address to send from
	pub sender_email: String,
	/// The display name to use for the sender
	pub sender_display_name: String,
	/// The username to use for the SMTP server, typically the same as the sender email
	pub username: String,
	/// The plaintext password to use for the SMTP server, which will be encrypted before being stored.
	/// This field is optional to support reusing the config for emailer config updates. If the password is not
	/// set, it will error when trying to send an email.
	pub password: Option<String>,
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

/// Information about an attachment to be sent in an email, including the actual content
#[derive(Debug, Clone)]
pub struct AttachmentPayload {
	/// The name of the attachment
	pub name: String,
	/// The bytes of the attachment
	pub content: Vec<u8>,
	/// The content type of the attachment, e.g. "text/plain"
	pub content_type: ContentType,
}

/// A client for sending emails
pub struct EmailerClient {
	/// The configuration for the email client
	config: EmailerClientConfig,
	/// The directory where email templates are stored
	template_dir: PathBuf,
}

impl EmailerClient {
	/// Create a new [EmailerClient] instance with the given configuration and template directory.
	///
	/// # Example
	/// ```no_run
	/// use email::{EmailerClient, EmailerClientConfig};
	/// use std::path::PathBuf;
	///
	/// let config = EmailerClientConfig {
	///     sender_email: "aaron@stumpapp.dev".to_string(),
	///     sender_display_name: "Aaron's Stump Instance".to_string(),
	///     username: "aaron@stumpapp.dev".to_string(),
	///     password: Some("decrypted_password".to_string()),
	///     host: "smtp.stumpapp.dev".to_string(),
	///     port: 587,
	///     tls_enabled: true,
	///     max_attachment_size_bytes: Some(10_000_000),
	///     max_num_attachments: Some(5),
	/// };
	/// let template_dir = PathBuf::from("/templates");
	/// let emailer = EmailerClient::new(config, template_dir);
	/// ```
	pub fn new(config: EmailerClientConfig, template_dir: PathBuf) -> Self {
		Self {
			config,
			template_dir,
		}
	}

	/// Send an email with the given subject and attachment to the given recipient.
	/// Internally, this will just call [EmailerClient::send_attachments] with a single attachment.
	///
	/// # Example
	/// ```no_run
	/// use email::{AttachmentPayload, EmailerClient, EmailerClientConfig};
	/// use std::path::PathBuf;
	/// use lettre::message::header::ContentType;
	///
	/// async fn test() {
	///     let config = EmailerClientConfig {
	///         sender_email: "aaron@stumpapp.dev".to_string(),
	///         sender_display_name: "Aaron's Stump Instance".to_string(),
	///         username: "aaron@stumpapp.dev".to_string(),
	///         password: Some("decrypted_password".to_string()),
	///         host: "smtp.stumpapp.dev".to_string(),
	///         port: 587,
	///         tls_enabled: true,
	///         max_attachment_size_bytes: Some(10_000_000),
	///         max_num_attachments: Some(5),
	///     };
	///     let template_dir = PathBuf::from("/templates");
	///     let emailer = EmailerClient::new(config, template_dir);
	///
	///     let result = emailer.send_attachment(
	///         "Attachment Test",
	///         "aaron@stumpapp.dev",
	///         AttachmentPayload {
	///             name: "test.txt".to_string(),
	///             content: b"Hello, world!".to_vec(),
	///             content_type: "text/plain".parse().unwrap(),
	///         },
	///     ).await;
	///     assert!(result.is_err()); // This will fail because the SMTP server is not real
	/// }
	/// ```
	pub async fn send_attachment(
		&self,
		subject: &str,
		recipient: &str,
		payload: AttachmentPayload,
	) -> EmailResult<()> {
		self.send_attachments(subject, recipient, vec![payload])
			.await
	}

	/// Send an email with the given subject and attachments to the given recipient.
	/// The attachments are sent as a multipart email, with the first attachment being the email body.
	///
	/// # Example
	/// ```no_run
	/// use email::{AttachmentPayload, EmailerClient, EmailerClientConfig};
	/// use std::path::PathBuf;
	/// use lettre::message::header::ContentType;
	///
	/// async fn test() {
	///     let config = EmailerClientConfig {
	///         sender_email: "aaron@stumpapp.dev".to_string(),
	///         sender_display_name: "Aaron's Stump Instance".to_string(),
	///         username: "aaron@stumpapp.dev".to_string(),
	///         password: Some("decrypted_password".to_string()),
	///         host: "smtp.stumpapp.dev".to_string(),
	///         port: 587,
	///         tls_enabled: true,
	///         max_attachment_size_bytes: Some(10_000_000),
	///         max_num_attachments: Some(5),
	///     };
	///     let template_dir = PathBuf::from("/templates");
	///     let emailer = EmailerClient::new(config, template_dir);
	///
	///     let result = emailer.send_attachments(
	///         "Attachment Test",
	///         "aaron@stumpapp.dev",
	///         vec![
	///             AttachmentPayload {
	///                 name: "test.txt".to_string(),
	///                 content: b"Hello, world!".to_vec(),
	///                 content_type: "text/plain".parse().unwrap(),
	///             },
	///             AttachmentPayload {
	///                 name: "test2.txt".to_string(),
	///                 content: b"Hello, world again!".to_vec(),
	///                 content_type: "text/plain".parse().unwrap(),
	///             },
	///         ],
	///     ).await;
	///     assert!(result.is_err()); // This will fail because the SMTP server is not real
	/// }
	/// ```
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

		let password = self
			.config
			.password
			.as_deref()
			.ok_or(EmailError::NoPassword)?
			.to_string();
		let creds = Credentials::new(self.config.username.clone(), password);

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

// TODO: write meaningful tests
