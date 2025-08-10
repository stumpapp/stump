use std::path::PathBuf;

use crate::{
	error_message::FORBIDDEN_ACTION,
	input::emailer::{EmailerSendTo, SendAttachmentEmailsInput},
};
use async_graphql::Result;
use email::{
	AttachmentPayload, EmailContentType, EmailResult, EmailerClient, EmailerClientConfig,
};
use sea_orm::{prelude::*, IntoActiveModel, NotSet, Set};
use stump_core::{
	filesystem::{ContentType, FileParts, PathUtils},
	utils::encryption::decrypt_string,
};

use models::entity::{
	emailer,
	emailer_send_record::{self, AttachmentMetaModel},
	media, registered_email_device,
	user::AuthUser,
};

trait AttachmentSender {
	async fn send(
		&self,
		recipient: &str,
		payloads: Vec<AttachmentPayload>,
	) -> EmailResult<()>;
}

struct AttachmentSenderImpl {
	emailer_client: EmailerClient,
}

impl AttachmentSenderImpl {
	pub fn new(
		encryption_key: String,
		templates_dir: PathBuf,
		emailer: emailer::Model,
	) -> Result<Self> {
		let emailer_client_config = build_emailer_client_config(encryption_key, emailer)?;
		Ok(Self {
			emailer_client: EmailerClient::new(emailer_client_config, templates_dir),
		})
	}
}

impl AttachmentSender for AttachmentSenderImpl {
	async fn send(
		&self,
		recipient: &str,
		payloads: Vec<AttachmentPayload>,
	) -> EmailResult<()> {
		self.emailer_client
			.send_attachments("Attachment from Stump", recipient, payloads)
			.await
	}
}

pub async fn send_attachment_email(
	conn: &DatabaseConnection,
	user: &AuthUser,
	encryption_key: String,
	templates_dir: PathBuf,
	input: SendAttachmentEmailsInput,
) -> Result<(usize, Vec<String>)> {
	let emailer = get_emailer(conn).await?;
	let emailer_client =
		AttachmentSenderImpl::new(encryption_key, templates_dir, emailer.clone())?;
	send_attachment_email_for_emailer(conn, user, input, emailer, emailer_client).await
}

async fn send_attachment_email_for_emailer<Sender>(
	conn: &DatabaseConnection,
	user: &AuthUser,
	input: SendAttachmentEmailsInput,
	emailer: emailer::Model,
	sender: Sender,
) -> Result<(usize, Vec<String>)>
where
	Sender: AttachmentSender,
{
	let media_ids = input
		.media_ids
		.iter()
		.map(|id| id.to_string())
		.collect::<Vec<_>>();
	let books = get_books(user, conn, &media_ids).await?;
	let recipients = get_and_validate_recipients(user, conn, &input.send_to).await?;

	let mut errors = Vec::new();
	let mut record_creates = Vec::new();

	let attachment_chunks =
		books.chunks(emailer.max_num_attachments.unwrap_or(1).try_into()?);
	for chunk in attachment_chunks {
		let result =
			send_attachments(user, &emailer, chunk, &recipients, &sender).await?;
		record_creates.extend(result.0);
		errors.extend(result.1);
	}

	let result = update_send_records(emailer, conn, record_creates).await?;
	errors.extend(result.1);

	Ok((result.0, errors))
}

async fn send_attachments<Sender>(
	user: &AuthUser,
	emailer: &emailer::Model,
	books: &[media::Model],
	recipients: &Vec<String>,
	sender: &Sender,
) -> Result<(Vec<emailer_send_record::ActiveModel>, Vec<String>)>
where
	Sender: AttachmentSender,
{
	let mut record_creates = Vec::new();
	let mut errors = Vec::new();

	// do not send if there are no books
	if books.is_empty() {
		return Ok((record_creates, errors));
	}

	// get the attachments
	let (attachments_meta_data, attachments) =
		get_attachments(books, emailer.max_attachment_size_bytes).await?;

	// for each recipient, send an email
	for recipient in recipients {
		let send_result = sender.send(recipient, attachments.clone()).await;

		match send_result {
			Ok(_) => {
				let active_model = emailer_send_record::ActiveModel {
					id: NotSet,
					emailer_id: Set(emailer.id),
					recipient_email: Set(recipient.clone()),
					attachment_meta: Set(Some(attachments_meta_data.clone())),
					sent_at: Set(chrono::Utc::now().into()),
					sent_by_user_id: Set(Some(user.id.clone())),
				};
				record_creates.push(active_model);
			},
			Err(e) => {
				tracing::error!(?recipient, ?e, "Failed to send email");
				errors.push(format!(
					"Failed to send attachments to {}: {}",
					recipient, e
				));
			},
		};
	}

	Ok((record_creates, errors))
}

async fn get_attachments(
	chunk: &[media::Model],
	max_attachment_size_bytes: Option<i32>,
) -> Result<(Vec<u8>, Vec<AttachmentPayload>)> {
	let mut attachments = Vec::new();
	let mut attachment_meta = Vec::new();
	for book in chunk {
		let (meta, attachment) =
			book_to_attachment(book, max_attachment_size_bytes).await?;
		attachments.push(attachment);
		attachment_meta.push(meta);
	}

	let attachments_meta_data = AttachmentMetaModel::into_data(&attachment_meta)?;

	Ok((attachments_meta_data, attachments))
}

async fn update_send_records(
	emailer: emailer::Model,
	conn: &DatabaseConnection,
	record_creates: Vec<emailer_send_record::ActiveModel>,
) -> Result<(usize, Vec<String>)> {
	let mut errors = Vec::new();
	let send_emails_count = record_creates.len();
	if send_emails_count > 0 {
		let insert_result = emailer_send_record::Entity::insert_many(record_creates)
			.exec_without_returning(conn)
			.await;

		if let Err(e) = insert_result {
			tracing::error!(?e, "Failed to create emailer send records!");
			errors.push(format!("Failed to create emailer send records: {}", e));
		}
	}

	let mut update_emailer = emailer.into_active_model();
	update_emailer.last_used_at = Set(Some(chrono::Utc::now().into()));
	update_emailer.update(conn).await.map_err(|e| {
		tracing::error!(?e, "Failed to update emailer last used at!");
		errors.push(format!("Failed to update emailer last used at: {}", e));
		e
	})?;

	Ok((send_emails_count, errors))
}

async fn book_to_attachment(
	book: &media::Model,
	max_attachment_size_bytes: Option<i32>,
) -> Result<(AttachmentMetaModel, AttachmentPayload)> {
	let content = tokio::fs::read(&book.path).await?;
	book_to_attachment_with_content(book, max_attachment_size_bytes, content).await
}

async fn book_to_attachment_with_content(
	book: &media::Model,
	max_attachment_size_bytes: Option<i32>,
	content: Vec<u8>,
) -> Result<(AttachmentMetaModel, AttachmentPayload)> {
	let FileParts {
		file_name,
		extension,
		..
	} = PathBuf::from(&book.path).file_parts();

	match (content.len(), max_attachment_size_bytes) {
		(content_len, Some(max_size)) if content_len as i32 > max_size => {
			tracing::warn!("Attachment too large: {} > {}", content_len, max_size);
			return Err("Attachment too large".to_string().into());
		},
		(content_len, _) if content_len < 5 => {
			tracing::warn!("Attachment too small: {} < 5", content_len);
			return Err("Attachment too small".to_string().into());
		},
		_ => {},
	}

	let content_type = ContentType::from_bytes_with_fallback(&content[..5], &extension)
		.mime_type()
		.parse::<EmailContentType>()
		.map_err(|e| {
			tracing::warn!(?e, "Failed to parse content type");
			"Failed to parse content type".to_string()
		})?;

	let attachment_meta = AttachmentMetaModel::new(
		file_name.clone(),
		Some(book.id.clone()),
		content.len() as i32,
	);

	let attachment = AttachmentPayload {
		name: file_name.clone(),
		content,
		content_type,
	};

	Ok((attachment_meta, attachment))
}

fn build_emailer_client_config(
	encryption_key: String,
	emailer: emailer::Model,
) -> Result<EmailerClientConfig> {
	if emailer.encrypted_password.is_empty() {
		return Err("No password provided".to_string().into());
	}

	let decrypted_password = decrypt_string(&emailer.encrypted_password, &encryption_key)
		.map_err(|e| {
			tracing::warn!(?e, "Failed to decrypt password");
			"Failed to decrypt password".to_string()
		})?;

	Ok(EmailerClientConfig {
		sender_email: emailer.sender_email,
		sender_display_name: emailer.sender_display_name,
		username: emailer.username,
		password: Some(decrypted_password),
		host: emailer.smtp_host,
		port: emailer.smtp_port.try_into()?,
		tls_enabled: emailer.tls_enabled,
		max_attachment_size_bytes: emailer.max_attachment_size_bytes,
		max_num_attachments: emailer.max_num_attachments,
	})
}

async fn get_emailer(conn: &DatabaseConnection) -> Result<emailer::Model> {
	let emailer = emailer::Entity::find()
		.filter(emailer::Column::IsPrimary.eq(true))
		.one(conn)
		.await?
		.ok_or("No primary emailer found")?;
	Ok(emailer)
}

async fn get_books(
	user: &AuthUser,
	conn: &DatabaseConnection,
	media_ids: &Vec<String>,
) -> Result<Vec<media::Model>> {
	let books = media::Entity::find_for_user(user)
		.filter(media::Column::Id.is_in(media_ids))
		.all(conn)
		.await?
		.into_iter()
		.collect::<Vec<_>>();

	if books.len() != media_ids.len() {
		tracing::error!(?books, ?media_ids, "Some media IDs were not found");
		return Err("Some media IDs were not found".to_string().into());
	}

	Ok(books)
}

async fn get_and_validate_recipients(
	user: &AuthUser,
	conn: &DatabaseConnection,
	send_to: &[EmailerSendTo],
) -> Result<Vec<String>> {
	let mut recipients: Vec<String> = Vec::new();

	for recipient in send_to {
		let email = match recipient {
			EmailerSendTo::Device(device) => get_device_email(conn, device.id).await?,
			EmailerSendTo::Anonymous(email) => email.email.clone(),
		};
		recipients.push(email);
	}

	check_forbidden_recipients(user, conn, &recipients).await?;

	Ok(recipients)
}

async fn check_forbidden_recipients(
	user: &AuthUser,
	conn: &DatabaseConnection,
	recipients: &Vec<String>,
) -> Result<()> {
	let forbidden_devices = registered_email_device::Entity::find()
		.filter(registered_email_device::Column::Forbidden.eq(true))
		.all(conn)
		.await?;

	let forbidden_recipients: Vec<String> = recipients
		.iter()
		.filter(|r| forbidden_devices.iter().any(|d| d.email == **r))
		.cloned()
		.collect();
	let has_forbidden_recipients = !forbidden_recipients.is_empty();
	if has_forbidden_recipients {
		tracing::error!(
			?user,
			?forbidden_recipients,
			"User attempted to send an email to unauthorized recipient(s)!"
		);

		Err(FORBIDDEN_ACTION.into())
	} else {
		Ok(())
	}
}

async fn get_device_email(conn: &DatabaseConnection, device_id: i32) -> Result<String> {
	let device = registered_email_device::Entity::find_by_id(device_id)
		.one(conn)
		.await?
		.ok_or("Device not found")?;

	Ok(device.email)
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::{
		input::emailer::{SendToDevice, SendToEmail},
		tests::common::*,
	};
	use email::EmailError;
	use models::shared::enums::FileStatus;
	use pretty_assertions::assert_eq;
	use sea_orm::{DatabaseBackend::Sqlite, MockDatabase};
	use stump_core::utils::encryption::encrypt_string;

	fn get_default_media() -> media::Model {
		media::Model {
			id: "1".to_string(),
			name: "Book 1".to_string(),
			size: 1234,
			extension: "epub".to_string(),
			pages: 100,
			updated_at: Some(chrono::Utc::now().into()),
			created_at: chrono::Utc::now().into(),
			modified_at: None,
			hash: None,
			koreader_hash: None,
			path: "path/to/book1.epub".to_string(),
			status: FileStatus::Ready,
			series_id: None,
			deleted_at: None,
		}
	}

	fn get_default_encryption_key() -> String {
		"test_key".to_string()
	}

	fn get_default_emailer() -> emailer::Model {
		let encryption_key = get_default_encryption_key();
		let encrypted_password =
			encrypt_string("test_password", &encryption_key).unwrap();
		emailer::Model {
			id: 1,
			is_primary: true,
			username: "test_user".to_string(),
			name: "Test Emailer".to_string(),
			encrypted_password,
			sender_display_name: "Test Sender".to_string(),
			sender_email: "test_user@gmail.com".to_string(),
			smtp_host: "smtp.test.com".to_string(),
			smtp_port: 587,
			tls_enabled: true,
			max_attachment_size_bytes: None,
			max_num_attachments: None,
			last_used_at: None,
		}
	}

	struct MockEmailerSender {
		is_error: bool,
	}

	impl AttachmentSender for MockEmailerSender {
		async fn send(
			&self,
			_recipient: &str,
			_payloads: Vec<AttachmentPayload>,
		) -> EmailResult<()> {
			if self.is_error {
				Err(EmailError::InvalidEmail("".to_string()))
			} else {
				Ok(())
			}
		}
	}

	#[tokio::test]
	async fn test_send_attachments_for_emailer_errors() {
		let mut emailer = get_default_emailer();
		emailer.max_num_attachments = Some(5);
		let sender = MockEmailerSender { is_error: true };
		let user = get_default_user();
		let input = SendAttachmentEmailsInput {
			media_ids: vec!["1".to_string().into(), "2".to_string().into()],
			send_to: vec![
				EmailerSendTo::Device(SendToDevice { id: 1 }),
				EmailerSendTo::Anonymous(SendToEmail {
					email: "cslewis@gmail.com".to_string(),
				}),
			],
		};

		let mut book1 = get_default_media();
		book1.path = get_test_epub_path();
		let mut book2 = book1.clone();
		book2.id = "2".to_string();

		let conn = MockDatabase::new(Sqlite)
			.append_query_results(vec![vec![book1.clone(), book2.clone()]])
			.append_query_results(vec![vec![registered_email_device::Model {
				id: 1,
				name: "test".to_string(),
				email: "cslewis@gmail.com".to_string(),
				forbidden: false,
			}]])
			.append_query_results::<registered_email_device::Model, _, _>(vec![vec![]])
			.append_query_results(vec![vec![emailer.clone()]])
			.append_exec_results(vec![sea_orm::MockExecResult {
				rows_affected: 1,
				last_insert_id: 0,
			}])
			.into_connection();

		let (count, errors) =
			send_attachment_email_for_emailer(&conn, &user, input, emailer, sender)
				.await
				.unwrap();

		assert_eq!(count, 0);
		assert_eq!(errors.len(), 2);
	}

	#[tokio::test]
	async fn test_send_attachments_for_emailer_multi_attachment() {
		let mut emailer = get_default_emailer();
		emailer.max_num_attachments = Some(5);
		let sender = MockEmailerSender { is_error: false };
		let user = get_default_user();
		let input = SendAttachmentEmailsInput {
			media_ids: vec!["1".to_string().into(), "2".to_string().into()],
			send_to: vec![
				EmailerSendTo::Device(SendToDevice { id: 1 }),
				EmailerSendTo::Anonymous(SendToEmail {
					email: "cslewis@gmail.com".to_string(),
				}),
			],
		};

		let mut book1 = get_default_media();
		book1.path = get_test_epub_path();
		let mut book2 = book1.clone();
		book2.id = "2".to_string();

		let conn = MockDatabase::new(Sqlite)
			.append_query_results(vec![vec![book1.clone(), book2.clone()]])
			.append_query_results(vec![vec![registered_email_device::Model {
				id: 1,
				name: "test".to_string(),
				email: "cslewis@gmail.com".to_string(),
				forbidden: false,
			}]])
			.append_query_results::<registered_email_device::Model, _, _>(vec![vec![]])
			.append_query_results(vec![vec![emailer.clone()]])
			.append_exec_results(vec![sea_orm::MockExecResult {
				rows_affected: 1,
				last_insert_id: 0,
			}])
			.into_connection();

		let (count, errors) =
			send_attachment_email_for_emailer(&conn, &user, input, emailer, sender)
				.await
				.unwrap();

		assert_eq!(count, 2);
		assert_eq!(errors.len(), 0);
	}

	#[tokio::test]
	async fn test_send_attachments_for_emailer_single_attachment() {
		let mut emailer = get_default_emailer();
		emailer.max_num_attachments = Some(1);
		let sender = MockEmailerSender { is_error: false };
		let user = get_default_user();
		let input = SendAttachmentEmailsInput {
			media_ids: vec!["1".to_string().into(), "2".to_string().into()],
			send_to: vec![
				EmailerSendTo::Device(SendToDevice { id: 1 }),
				EmailerSendTo::Anonymous(SendToEmail {
					email: "cslewis@gmail.com".to_string(),
				}),
			],
		};

		let mut book1 = get_default_media();
		book1.path = get_test_epub_path();
		let mut book2 = book1.clone();
		book2.id = "2".to_string();

		let conn = MockDatabase::new(Sqlite)
			.append_query_results(vec![vec![book1.clone(), book2.clone()]])
			.append_query_results(vec![vec![registered_email_device::Model {
				id: 1,
				name: "test".to_string(),
				email: "cslewis@gmail.com".to_string(),
				forbidden: false,
			}]])
			.append_query_results::<registered_email_device::Model, _, _>(vec![vec![]])
			.append_query_results(vec![vec![emailer.clone()]])
			.append_exec_results(vec![sea_orm::MockExecResult {
				rows_affected: 1,
				last_insert_id: 0,
			}])
			.into_connection();

		let (count, errors) =
			send_attachment_email_for_emailer(&conn, &user, input, emailer, sender)
				.await
				.unwrap();

		assert_eq!(count, 4);
		assert_eq!(errors.len(), 0);
	}

	#[tokio::test]
	async fn test_send_attachments_empty() {
		let user = get_default_user();

		let recipients = vec![
			"tolkien@gmail.com".to_string(),
			"cslewis@gmail.com".to_string(),
		];

		let emailer = get_default_emailer();
		let sender = MockEmailerSender { is_error: false };

		let (records, errors) =
			send_attachments(&user, &emailer, &[], &recipients, &sender)
				.await
				.unwrap();

		assert_eq!(records.len(), 0);
		assert_eq!(errors.len(), 0);
	}

	#[tokio::test]
	async fn test_send_attachments_errors() {
		let user = get_default_user();
		let mut book = get_default_media();
		book.path = get_test_epub_path();

		let recipients = vec![
			"tolkien@gmail.com".to_string(),
			"cslewis@gmail.com".to_string(),
		];

		let emailer = get_default_emailer();
		let sender = MockEmailerSender { is_error: true };

		let (records, errors) =
			send_attachments(&user, &emailer, &vec![book], &recipients, &sender)
				.await
				.unwrap();

		assert_eq!(records.len(), 0);
		assert_eq!(errors.len(), 2);
	}

	#[tokio::test]
	async fn test_send_attachments() {
		let user = get_default_user();
		let mut book = get_default_media();
		book.path = get_test_epub_path();

		let recipients = vec![
			"tolkien@gmail.com".to_string(),
			"cslewis@gmail.com".to_string(),
		];

		let emailer = get_default_emailer();
		let sender = MockEmailerSender { is_error: false };

		let (records, errors) =
			send_attachments(&user, &emailer, &vec![book], &recipients, &sender)
				.await
				.unwrap();

		assert_eq!(records.len(), 2);
		assert_eq!(
			records[0].recipient_email,
			Set("tolkien@gmail.com".to_string())
		);
		assert_eq!(
			records[1].recipient_email,
			Set("cslewis@gmail.com".to_string())
		);
		assert_eq!(errors.len(), 0);
	}

	#[tokio::test]
	async fn test_get_attachments_empty() {
		let (meta_data, payload) = get_attachments(&[], None).await.unwrap();
		let meta = AttachmentMetaModel::vec_from_data(&meta_data).unwrap();
		assert_eq!(payload.len(), 0);
		assert_eq!(meta.len(), 0);
	}

	#[tokio::test]
	async fn test_get_attachments() {
		let mut book = get_default_media();
		book.path = get_test_epub_path();
		let (meta_data, payload) = get_attachments(&[book], None).await.unwrap();
		let meta = AttachmentMetaModel::vec_from_data(&meta_data).unwrap();
		assert!(!payload.is_empty());
		assert_eq!(meta.len(), 1);
		assert_eq!(meta[0].media_id, Some("1".to_string()));
		assert_eq!(meta[0].filename, "book.epub");
	}

	#[tokio::test]
	async fn test_update_send_records_errors() {
		let emailer = get_default_emailer();
		let conn = MockDatabase::new(Sqlite)
			.append_query_results(vec![vec![emailer.clone()]])
			.append_exec_errors(vec![DbErr::Custom("Error".to_string())])
			.append_exec_results(vec![sea_orm::MockExecResult {
				rows_affected: 1,
				last_insert_id: 0,
			}])
			.into_connection();

		let send_record = emailer_send_record::ActiveModel {
			id: NotSet,
			recipient_email: Set("tolkien@gmail.com".to_string()),
			emailer_id: Set(emailer.id),
			attachment_meta: Set(None),
			sent_at: Set(chrono::Utc::now().into()),
			sent_by_user_id: Set(Some("42".to_string())),
		};

		let (size, errors) = update_send_records(emailer, &conn, vec![send_record])
			.await
			.unwrap();

		assert_eq!(size, 1);
		assert_eq!(errors.len(), 1);
	}

	#[tokio::test]
	async fn test_update_send_records() {
		let emailer = get_default_emailer();
		let conn = MockDatabase::new(Sqlite)
			.append_query_results(vec![vec![emailer.clone()]])
			.append_exec_results(vec![
				sea_orm::MockExecResult {
					rows_affected: 1,
					last_insert_id: 0,
				},
				sea_orm::MockExecResult {
					rows_affected: 1,
					last_insert_id: 0,
				},
			])
			.into_connection();

		let send_record = emailer_send_record::ActiveModel {
			id: NotSet,
			recipient_email: Set("tolkien@gmail.com".to_string()),
			emailer_id: Set(emailer.id),
			attachment_meta: Set(None),
			sent_at: Set(chrono::Utc::now().into()),
			sent_by_user_id: Set(Some("42".to_string())),
		};

		let (size, errors) = update_send_records(emailer, &conn, vec![send_record])
			.await
			.unwrap();

		assert_eq!(size, 1);
		assert_eq!(errors.len(), 0);
	}

	#[tokio::test]
	async fn test_update_send_records_empty() {
		let emailer = get_default_emailer();
		let conn = MockDatabase::new(Sqlite)
			.append_query_results(vec![vec![emailer.clone()]])
			.append_exec_results(vec![sea_orm::MockExecResult {
				rows_affected: 1,
				last_insert_id: 0,
			}])
			.into_connection();

		let (size, errors) = update_send_records(emailer, &conn, vec![]).await.unwrap();

		assert_eq!(size, 0);
		assert_eq!(errors.len(), 0);
	}

	#[tokio::test]
	async fn test_book_to_attachment() {
		let book = get_default_media();
		let content = vec![0; 10]; // 10 bytes

		let (meta, payload) = book_to_attachment_with_content(&book, Some(10), content)
			.await
			.unwrap();
		assert_eq!(meta.filename, "book1.epub");
		assert_eq!(meta.media_id, Some("1".to_string()));
		assert_eq!(meta.size, 10);
		assert_eq!(payload.content.len(), 10);
		assert_eq!(
			payload.content_type,
			EmailContentType::parse("application/epub+zip").unwrap()
		);
		assert_eq!(payload.name, "book1.epub");
	}

	#[tokio::test]
	async fn test_book_to_attachment_malformed() {
		let mut book = get_default_media();
		book.path = "path/to/book1.asdsdf".to_string(); // bad extension
		let content = vec![0; 10]; // 10 bytes

		let result = book_to_attachment_with_content(&book, Some(10), content).await;
		assert!(result.is_err());
	}

	#[tokio::test]
	async fn test_book_to_attachment_bad_content_len() {
		let book = get_default_media();
		let content = vec![0; 4]; // 4 bytes

		let result = book_to_attachment_with_content(&book, None, content).await;
		assert!(result.is_err());

		let content = vec![0; 15];
		let result = book_to_attachment_with_content(&book, Some(10), content).await;
		assert!(result.is_err());
	}

	#[tokio::test]
	async fn test_build_emailer_client_empty_password() {
		let encryption_key = get_default_encryption_key();
		let mut emailer = get_default_emailer();
		emailer.encrypted_password = "".to_string();

		let result = build_emailer_client_config(encryption_key, emailer);
		assert!(result.is_err());
	}

	#[tokio::test]
	async fn test_build_emailer_client() {
		let encryption_key = get_default_encryption_key();
		let emailer = get_default_emailer();

		let client_config = build_emailer_client_config(encryption_key, emailer).unwrap();
		assert_eq!(client_config.sender_email, "test_user@gmail.com");
		assert_eq!(client_config.sender_display_name, "Test Sender");
		assert_eq!(client_config.password, Some("test_password".to_string()));
	}

	#[tokio::test]
	async fn test_get_books_empty() {
		let user = get_default_user();
		let conn = MockDatabase::new(Sqlite)
			.append_query_results::<media::Model, _, _>(vec![vec![]])
			.into_connection();

		let books = get_books(&user, &conn, &vec![]).await.unwrap();
		assert_eq!(books.len(), 0);
	}

	#[tokio::test]
	async fn test_get_books() {
		let user = get_default_user();
		let conn = MockDatabase::new(Sqlite)
			.append_query_results(vec![vec![get_default_media()]])
			.into_connection();

		let media_ids = vec!["1".to_string()];
		let books = get_books(&user, &conn, &media_ids).await.unwrap();
		assert_eq!(books.len(), 1);
		assert_eq!(books[0].id, "1");
		assert_eq!(books[0].name, "Book 1");
	}

	#[tokio::test]
	async fn test_get_books_missing() {
		let book1 = get_default_media();
		let mut book2 = book1.clone();
		book2.id = "2".to_string();
		book2.name = "Book 2".to_string();
		let user = get_default_user();
		let conn = MockDatabase::new(Sqlite)
			.append_query_results(vec![vec![book2]])
			.into_connection();

		let media_ids = vec!["1".to_string(), "2".to_string()];
		let books = get_books(&user, &conn, &media_ids).await;
		assert!(books.is_err());
	}

	#[tokio::test]
	async fn test_get_and_validate_recipients_empty() {
		let user = get_default_user();
		let conn = MockDatabase::new(Sqlite)
			.append_query_results::<registered_email_device::Model, _, _>(vec![vec![]])
			.into_connection();

		let results = get_and_validate_recipients(&user, &conn, &[])
			.await
			.unwrap();
		assert_eq!(results.len(), 0);
	}

	#[tokio::test]
	async fn test_get_and_validate_recipients() {
		let user = get_default_user();
		let conn = MockDatabase::new(Sqlite)
			.append_query_results(vec![vec![registered_email_device::Model {
				id: 1,
				name: "test".to_string(),
				email: "cslewis@gmail.com".to_string(),
				forbidden: false,
			}]])
			.append_query_results::<registered_email_device::Model, _, _>(vec![vec![]])
			.into_connection();

		let send_to = vec![
			EmailerSendTo::Anonymous(SendToEmail {
				email: "tolkien@gmail.com".to_string(),
			}),
			EmailerSendTo::Device(SendToDevice { id: 1 }),
		];

		let mut results = get_and_validate_recipients(&user, &conn, &send_to)
			.await
			.unwrap();
		results.sort();
		assert_eq!(results.len(), 2);
		assert_eq!(results[0], "cslewis@gmail.com");
		assert_eq!(results[1], "tolkien@gmail.com");
	}

	#[tokio::test]
	async fn test_forbidden_recipients() {
		let vec = vec![registered_email_device::Model {
			id: 1,
			name: "test".to_string(),
			email: "tolkien@gmail.com".to_string(),
			forbidden: true,
		}];
		let conn = MockDatabase::new(Sqlite)
			.append_query_results(vec![vec])
			.into_connection();

		let user = get_default_user();

		let result = check_forbidden_recipients(
			&user,
			&conn,
			&vec![
				"cslewis@gmail.com".to_string(),
				"tolkien@gmail.com".to_string(),
			],
		)
		.await;

		assert!(result.is_err());
	}

	#[tokio::test]
	async fn test_forbidden_recipients_ok() {
		let conn = MockDatabase::new(Sqlite)
			.append_query_results::<registered_email_device::Model, _, _>(vec![vec![]])
			.into_connection();

		let user = get_default_user();

		let result = check_forbidden_recipients(
			&user,
			&conn,
			&vec![
				"cslewis@gmail.com".to_string(),
				"tolkien@gmail.com".to_string(),
			],
		)
		.await;

		assert!(result.is_ok());
	}
}
