use std::path::PathBuf;

use axum::{
	extract::{Path, State},
	middleware::from_extractor_with_state,
	routing::{get, post},
	Json, Router,
};
use prisma_client_rust::Direction;
use serde::{Deserialize, Serialize};
use specta::Type;
use stump_core::{
	db::entity::{
		AttachmentMeta, EmailerConfig, EmailerConfigInput, EmailerSendRecord,
		EmailerSendTo, Media, RegisteredEmailDevice, SMTPEmailer, User, UserPermission,
	},
	filesystem::{read_entire_file, ContentType, FileParts, PathUtils},
	prisma::{emailer, emailer_send_record, registered_email_device, user, PrismaClient},
	AttachmentPayload, EmailContentType,
};
use tower_sessions::Session;
use utoipa::ToSchema;

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	filter::{chain_optional_iter, MediaFilter},
	middleware::auth::Auth,
	routers::api::v1::media::apply_media_filters_for_user,
	utils::enforce_session_permissions,
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.nest(
			"/emailers",
			Router::new()
				.route("/", get(get_emailers).post(create_emailer))
				.nest(
					"/:id",
					Router::new()
						.route(
							"/",
							get(get_emailer_by_id)
								.put(update_emailer)
								// .patch(patch_emailer)
								.delete(delete_emailer),
						)
						.nest(
							"/send-history",
							Router::new().route("/", get(get_emailer_send_history)),
						),
				)
				.route("/send-attachment", post(send_attachment_email)),
		)
		.nest(
			"/email-devices",
			Router::new()
				.route("/", get(get_email_devices).post(create_email_device))
				.nest(
					"/:id",
					Router::new().route(
						"/",
						get(get_email_device_by_id)
							.put(update_email_device)
							.patch(patch_email_device)
							.delete(delete_email_device),
					),
				),
		)
		.layer(from_extractor_with_state::<Auth, AppState>(app_state))
}

#[utoipa::path(
	get,
	path = "/api/v1/emailers",
	tag = "emailer",
	responses(
		(status = 200, description = "Successfully retrieved emailers", body = Vec<SMTPEmailer>),
		(status = 401, description = "Unauthorized"),
		(status = 404, description = "Bad request"),
		(status = 500, description = "Internal server error")
	)
)]
async fn get_emailers(
	State(ctx): State<AppState>,
	session: Session,
) -> APIResult<Json<Vec<SMTPEmailer>>> {
	enforce_session_permissions(&session, &[UserPermission::EmailerRead])?;

	let client = &ctx.db;

	let emailers = client
		.emailer()
		.find_many(vec![])
		.exec()
		.await?
		.into_iter()
		.map(SMTPEmailer::try_from)
		.collect::<Vec<Result<SMTPEmailer, _>>>();
	let emailers = emailers.into_iter().collect::<Result<Vec<_>, _>>()?;

	Ok(Json(emailers))
}

#[utoipa::path(
	get,
	path = "/api/v1/emailers/:id",
	tag = "emailer",
	params(
		("id" = i32, Path, description = "The emailer ID")
	),
	responses(
		(status = 200, description = "Successfully retrieved emailer", body = Notifier),
		(status = 401, description = "Unauthorized"),
		(status = 404, description = "Notifier not found"),
		(status = 500, description = "Internal server error")
	)
)]
async fn get_emailer_by_id(
	State(ctx): State<AppState>,
	Path(id): Path<i32>,
	session: Session,
) -> APIResult<Json<SMTPEmailer>> {
	enforce_session_permissions(&session, &[UserPermission::EmailerRead])?;

	let client = &ctx.db;

	let emailer = client
		.emailer()
		.find_first(vec![emailer::id::equals(id)])
		.exec()
		.await?
		.ok_or(APIError::NotFound("Emailer not found".to_string()))?;

	Ok(Json(SMTPEmailer::try_from(emailer)?))
}

/// Input object for creating or updating an emailer
#[derive(Deserialize, ToSchema, Type)]
pub struct CreateOrUpdateEmailer {
	/// The friendly name for the emailer
	name: String,
	/// Whether the emailer is the primary emailer
	is_primary: bool,
	/// The emailer configuration
	config: EmailerConfigInput,
}

/// Create a new emailer
#[utoipa::path(
	post,
	path = "/api/v1/emailers",
	tag = "emailer",
	request_body = CreateOrUpdateEmailer,
	responses(
		(status = 200, description = "Successfully created emailer"),
		(status = 400, description = "Bad request"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 500, description = "Internal server error")
	)
)]
async fn create_emailer(
	State(ctx): State<AppState>,
	session: Session,
	Json(payload): Json<CreateOrUpdateEmailer>,
) -> APIResult<Json<SMTPEmailer>> {
	enforce_session_permissions(&session, &[UserPermission::EmailerCreate])?;

	let client = &ctx.db;

	let config = EmailerConfig::from_client_config(payload.config, &ctx).await?;
	let emailer = client
		.emailer()
		.create(
			payload.name,
			config.sender_email,
			config.sender_display_name,
			config.username,
			config.encrypted_password,
			config.smtp_host.to_string(),
			config.smtp_port.into(),
			vec![
				emailer::is_primary::set(payload.is_primary),
				emailer::max_attachment_size_bytes::set(config.max_attachment_size_bytes),
			],
		)
		.exec()
		.await?;
	Ok(Json(SMTPEmailer::try_from(emailer)?))
}

/// Update an existing emailer by ID
#[utoipa::path(
	put,
	path = "/api/v1/emailers/:id",
	tag = "emailer",
	request_body = CreateOrUpdateEmailer,
	params(
		("id" = i32, Path, description = "The id of the emailer to update")
	),
	responses(
		(status = 200, description = "Successfully updated emailer"),
		(status = 400, description = "Bad request"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Not found"),
		(status = 500, description = "Internal server error")
	)
)]
async fn update_emailer(
	State(ctx): State<AppState>,
	Path(id): Path<i32>,
	session: Session,
	Json(payload): Json<CreateOrUpdateEmailer>,
) -> APIResult<Json<SMTPEmailer>> {
	enforce_session_permissions(&session, &[UserPermission::EmailerManage])?;

	let client = &ctx.db;
	let config = EmailerConfig::from_client_config(payload.config, &ctx).await?;
	let updated_emailer = client
		.emailer()
		.update(
			emailer::id::equals(id),
			vec![
				emailer::name::set(payload.name),
				emailer::sender_email::set(config.sender_email),
				emailer::sender_display_name::set(config.sender_display_name),
				emailer::username::set(config.username),
				emailer::encrypted_password::set(config.encrypted_password),
				emailer::smtp_host::set(config.smtp_host.to_string()),
				emailer::smtp_port::set(config.smtp_port.into()),
				emailer::max_attachment_size_bytes::set(config.max_attachment_size_bytes),
			],
		)
		.exec()
		.await?;
	Ok(Json(SMTPEmailer::try_from(updated_emailer)?))
}

// #[derive(Deserialize, ToSchema, Type)]
// pub struct PatchEmailer {}

// #[utoipa::path(
//     patch,
//     path = "/api/v1/emailers/:id/",
//     tag = "emailer",
//     params(
//         ("id" = i32, Path, description = "The ID of the emailer")
//     ),
//     responses(
//         (status = 200, description = "Successfully updated emailer"),
//         (status = 401, description = "Unauthorized"),
//         (status = 403, description = "Forbidden"),
//         (status = 404, description = "Notifier not found"),
//         (status = 500, description = "Internal server error"),
//     )
// )]
// async fn patch_emailer(
// 	State(ctx): State<AppState>,
// 	Path(id): Path<i32>,
// 	session: Session,
// 	Json(payload): Json<PatchEmailer>,
// ) -> APIResult<Json<SMTPEmailer>> {
// 	// enforce_session_permissions(&session, &[UserPermission::ManageNotifier])?;

// 	let client = &ctx.db;

// 	unimplemented!()

// 	// Ok(Json(SMTPEmailer::try_from(patched_emailer)?))
// }

/// Delete an emailer by ID
#[utoipa::path(
	delete,
	path = "/api/v1/emailers/:id/",
	tag = "emailer",
	params(
		("id" = i32, Path, description = "The emailer ID"),
	),
	responses(
		(status = 200, description = "Successfully deleted emailer"),
		(status = 401, description = "Unauthorized"),
		(status = 404, description = "Notifier not found"),
		(status = 500, description = "Internal server error")
	)
)]
async fn delete_emailer(
	State(ctx): State<AppState>,
	Path(id): Path<i32>,
	session: Session,
) -> APIResult<Json<SMTPEmailer>> {
	enforce_session_permissions(&session, &[UserPermission::EmailerManage])?;

	let client = &ctx.db;

	let deleted_emailer = client
		.emailer()
		.delete(emailer::id::equals(id))
		.exec()
		.await?;

	Ok(Json(SMTPEmailer::try_from(deleted_emailer)?))
}

#[utoipa::path(
	get,
	path = "/api/v1/emailers/:id/send-history",
	tag = "emailer",
	params(
		("id" = i32, Path, description = "The ID of the emailer")
	),
	responses(
		(status = 200, description = "Successfully retrieved emailer send history"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 500, description = "Internal server error")
	)
)]
async fn get_emailer_send_history(
	Path(emailer_id): Path<i32>,
	State(ctx): State<AppState>,
	session: Session,
) -> APIResult<Json<Vec<EmailerSendRecord>>> {
	tracing::trace!(?emailer_id, "get_emailer_send_history");
	enforce_session_permissions(&session, &[UserPermission::EmailerRead])?;

	let client = &ctx.db;

	let history = client
		.emailer_send_record()
		.find_many(vec![emailer_send_record::emailer_id::equals(emailer_id)])
		.order_by(emailer_send_record::sent_at::order(Direction::Desc))
		.exec()
		.await?;

	Ok(Json(
		history
			.into_iter()
			.map(EmailerSendRecord::try_from)
			.collect::<Vec<Result<EmailerSendRecord, _>>>()
			.into_iter()
			.collect::<Result<Vec<_>, _>>()?,
	))
}

#[derive(Deserialize, ToSchema, Type)]
pub struct SendAttachmentEmailsPayload {
	media_ids: Vec<String>,
	send_to: Vec<EmailerSendTo>,
}

#[derive(Serialize, ToSchema, Type)]
pub struct SendAttachmentEmailResponse {
	sent_emails_count: i32,
	errors: Vec<String>,
}

async fn get_and_validate_recipients(
	user: &User,
	client: &PrismaClient,
	send_to: &[EmailerSendTo],
) -> APIResult<Vec<String>> {
	let mut recipients = Vec::new();
	for to in send_to {
		let recipient = match to {
			EmailerSendTo::Device { device_id } => {
				let device = client
					.registered_email_device()
					.find_first(vec![registered_email_device::id::equals(*device_id)])
					.exec()
					.await?
					.ok_or(APIError::NotFound("Device not found".to_string()))?;
				device.email
			},
			EmailerSendTo::Anonymous { email } => email.clone(),
		};
		recipients.push(recipient);
	}

	let forbidden_devices = client
		.registered_email_device()
		.find_many(vec![registered_email_device::forbidden::equals(true)])
		.exec()
		.await?;
	let forbidden_recipients = recipients
		.iter()
		.filter(|r| forbidden_devices.iter().any(|d| d.email == **r))
		.cloned()
		.collect::<Vec<_>>();
	let has_forbidden_recipients = !forbidden_recipients.is_empty();

	if has_forbidden_recipients {
		tracing::error!(
			?user,
			?forbidden_recipients,
			"User attempted to send an email to unauthorized recipient(s)!"
		);
		return Err(APIError::forbidden_discreet());
	}

	Ok(recipients)
}

async fn send_attachment_email(
	State(ctx): State<AppState>,
	session: Session,
	Json(payload): Json<SendAttachmentEmailsPayload>,
) -> APIResult<Json<SendAttachmentEmailResponse>> {
	let by_user = enforce_session_permissions(
		&session,
		&chain_optional_iter(
			[UserPermission::EmailSend],
			[payload
				.send_to
				.iter()
				.any(|to| matches!(to, EmailerSendTo::Anonymous { .. }))
				.then(|| UserPermission::EmailArbitrarySend)],
		),
	)?;

	let client = &ctx.db;

	let emailer = client
		.emailer()
		.find_first(vec![emailer::is_primary::equals(true)])
		.exec()
		.await?
		.ok_or(APIError::NotFound("Primary emailer not found".to_string()))?;
	let emailer = SMTPEmailer::try_from(emailer)?;
	let emailer_id = emailer.id;
	let max_attachment_size_bytes = emailer.config.max_attachment_size_bytes;

	let expected_books_len = payload.media_ids.len();
	let books = client
		.media()
		.find_many(apply_media_filters_for_user(
			MediaFilter::ids(payload.media_ids),
			&by_user,
		))
		.exec()
		.await?
		.into_iter()
		.map(Media::from)
		.collect::<Vec<_>>();

	if books.len() != expected_books_len {
		tracing::error!(?books, ?expected_books_len, "Some media IDs were not found");
		return Err(APIError::BadRequest(
			"Some media IDs were not found".to_string(),
		));
	}

	let (tx, tx_client) = client._transaction().begin().await?;
	let recipients =
		match get_and_validate_recipients(&by_user, &tx_client, &payload.send_to).await {
			Ok(r) => {
				tx.commit(tx_client).await?;
				r
			},
			Err(e) => {
				tx.rollback(tx_client).await?;
				return Err(e);
			},
		};

	let emailer_client = emailer.into_client(&ctx).await?;
	let mut record_creates =
		Vec::<(i32, String, Vec<emailer_send_record::SetParam>)>::new();
	let mut errors = Vec::new();

	// TODO: Refactor this to chunk the books and send them in batches according to
	// the max attachments per email limit

	for book in books {
		let FileParts {
			file_name,
			extension,
			..
		} = PathBuf::from(&book.path).file_parts();
		let content = read_entire_file(book.path)?;

		// TODO: should error?
		match (content.len(), max_attachment_size_bytes) {
			(_, Some(max_size)) if content.len() as i32 > max_size => {
				tracing::warn!("Attachment too large: {} > {}", content.len(), max_size);
				continue;
			},
			(_, _) if content.len() < 5 => {
				tracing::warn!("Attachment too small: {} < 5", content.len());
				continue;
			},
			_ => {},
		}

		let content_type =
			ContentType::from_bytes_with_fallback(&content[..5], &extension)
				.mime_type()
				.parse::<EmailContentType>()
				.map_err(|_| {
					APIError::InternalServerError(
						"Failed to parse content type".to_string(),
					)
				})?;

		let attachment_meta = AttachmentMeta::new(
			file_name.clone(),
			Some(book.id.clone()),
			content.len() as i32,
		)
		.into_data()
		.map_or_else(
			|e| {
				tracing::error!(?e, "Failed to serialize attachment meta");
				None
			},
			Some,
		);

		for recipient in recipients.iter() {
			let send_result = emailer_client
				.send_attachment(
					"Attachment from Stump",
					&recipient,
					AttachmentPayload {
						name: file_name.clone(),
						content: content.clone(),
						content_type: content_type.clone(),
					},
				)
				.await;

			match send_result {
				Ok(_) => {
					record_creates.push((
						emailer_id,
						recipient.clone(),
						vec![
							emailer_send_record::sent_by::connect(user::id::equals(
								by_user.id.clone(),
							)),
							emailer_send_record::attachment_meta::set(
								attachment_meta.clone(),
							),
						],
					));
				},
				Err(e) => {
					tracing::error!(?e, "Failed to send email");
					errors.push(format!(
						"Failed to send {} to {}: {}",
						file_name, recipient, e
					));
					continue;
				},
			}
		}
	}

	let sent_emails_count = record_creates.len();
	let affected_rows = client
		.emailer_send_record()
		.create_many(record_creates)
		.exec()
		.await?;

	if affected_rows != sent_emails_count as i64 {
		tracing::warn!(
			created_records = ?affected_rows,
			expected = ?sent_emails_count,
			"Failed to create all emailer send records",
		);
		errors.push("Failed to create all emailer send records".to_string());
	}

	Ok(Json(SendAttachmentEmailResponse {
		sent_emails_count: sent_emails_count as i32,
		errors,
	}))
}

/// Get all email devices on the server
#[utoipa::path(
    get,
    path = "/api/v1/email-devices",
    tag = "email-devices",
    responses(
        (status = 200, description = "Successfully retrieved email devices"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 500, description = "Internal server error")
    )
)]
async fn get_email_devices(
	State(ctx): State<AppState>,
	session: Session,
) -> APIResult<Json<Vec<RegisteredEmailDevice>>> {
	enforce_session_permissions(&session, &[UserPermission::EmailSend])?;

	let client = &ctx.db;

	let devices = client
		.registered_email_device()
		.find_many(vec![])
		.exec()
		.await?;

	Ok(Json(
		devices
			.into_iter()
			.map(RegisteredEmailDevice::from)
			.collect(),
	))
}

/// Get an email device by its ID
#[utoipa::path(
    get,
    path = "/api/v1/email-devices/:id",
    tag = "email-devices",
    params(
        ("id" = i32, Path, description = "The ID of the email device")
    ),
    responses(
        (status = 200, description = "Successfully retrieved email device"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 404, description = "Device not found"),
        (status = 500, description = "Internal server error")
    )
)]
async fn get_email_device_by_id(
	State(ctx): State<AppState>,
	Path(id): Path<i32>,
	session: Session,
) -> APIResult<Json<RegisteredEmailDevice>> {
	enforce_session_permissions(&session, &[UserPermission::EmailSend])?;

	let client = &ctx.db;

	let device = client
		.registered_email_device()
		.find_unique(registered_email_device::id::equals(id))
		.exec()
		.await?
		.ok_or(APIError::NotFound("Device not found".to_string()))?;

	Ok(Json(RegisteredEmailDevice::from(device)))
}

/// Input object for creating or updating an email device
#[derive(Deserialize, ToSchema, Type)]
pub struct CreateOrUpdateEmailDevice {
	/// The friendly name of the email device, e.g. "Aaron's Kobo"
	name: String,
	/// The email address of the device
	email: String,
	/// Whether the device is forbidden from receiving emails from the server.
	forbidden: bool,
}

/// Create a new email device
#[utoipa::path(
    post,
    path = "/api/v1/email-devices",
    tag = "email-devices",
    responses(
        (status = 200, description = "Successfully created email device"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 500, description = "Internal server error")
    )
)]
async fn create_email_device(
	State(ctx): State<AppState>,
	session: Session,
	Json(payload): Json<CreateOrUpdateEmailDevice>,
) -> APIResult<Json<RegisteredEmailDevice>> {
	enforce_session_permissions(&session, &[UserPermission::EmailerManage])?;

	let client = &ctx.db;

	let device = client
		.registered_email_device()
		.create(
			payload.name,
			payload.email,
			vec![registered_email_device::forbidden::set(payload.forbidden)],
		)
		.exec()
		.await?;

	Ok(Json(RegisteredEmailDevice::from(device)))
}

/// Update an existing email device by its ID
#[utoipa::path(
    put,
    path = "/api/v1/email-devices/:id",
    tag = "email-devices",
    params(
        ("id" = i32, Path, description = "The ID of the email device")
    ),
    responses(
        (status = 200, description = "Successfully updated email device"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 404, description = "Device not found"),
        (status = 500, description = "Internal server error")
    )
)]
async fn update_email_device(
	State(ctx): State<AppState>,
	Path(id): Path<i32>,
	session: Session,
	Json(payload): Json<CreateOrUpdateEmailDevice>,
) -> APIResult<Json<RegisteredEmailDevice>> {
	enforce_session_permissions(&session, &[UserPermission::EmailerManage])?;

	let client = &ctx.db;

	let device = client
		.registered_email_device()
		.update(
			registered_email_device::id::equals(id),
			vec![
				registered_email_device::name::set(payload.name),
				registered_email_device::email::set(payload.email),
				registered_email_device::forbidden::set(payload.forbidden),
			],
		)
		.exec()
		.await?;

	Ok(Json(RegisteredEmailDevice::from(device)))
}

/// Patch an existing email device by its ID
#[derive(Deserialize, ToSchema, Type)]
pub struct PatchEmailDevice {
	/// The friendly name of the email device, e.g. "Aaron's Kobo"
	pub name: Option<String>,
	/// The email address of the device
	pub email: Option<String>,
	/// Whether the device is forbidden from receiving emails from the server.
	pub forbidden: Option<bool>,
}

#[utoipa::path(
    patch,
    path = "/api/v1/email-devices/:id",
    tag = "email-devices",
    params(
        ("id" = i32, Path, description = "The ID of the email device")
    ),
    responses(
        (status = 200, description = "Successfully patched email device"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 404, description = "Device not found"),
        (status = 500, description = "Internal server error")
    )
)]
async fn patch_email_device(
	State(ctx): State<AppState>,
	Path(id): Path<i32>,
	session: Session,
	Json(payload): Json<PatchEmailDevice>,
) -> APIResult<Json<RegisteredEmailDevice>> {
	enforce_session_permissions(&session, &[UserPermission::EmailerManage])?;

	let client = &ctx.db;

	let device = client
		.registered_email_device()
		.update(
			registered_email_device::id::equals(id),
			chain_optional_iter(
				[],
				[
					payload
						.name
						.map(|name| registered_email_device::name::set(name)),
					payload
						.email
						.map(|email| registered_email_device::email::set(email)),
					payload.forbidden.map(|forbidden| {
						registered_email_device::forbidden::set(forbidden)
					}),
				],
			),
		)
		.exec()
		.await?;

	Ok(Json(RegisteredEmailDevice::from(device)))
}

/// Delete an email device by its ID
#[utoipa::path(
    delete,
    path = "/api/v1/email-devices/:id",
    tag = "email-devices",
    params(
        ("id" = i32, Path, description = "The ID of the email device")
    ),
    responses(
        (status = 200, description = "Successfully deleted email device"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 404, description = "Device not found"),
        (status = 500, description = "Internal server error")
    )
)]
async fn delete_email_device(
	State(ctx): State<AppState>,
	Path(id): Path<i32>,
	session: Session,
) -> APIResult<Json<RegisteredEmailDevice>> {
	enforce_session_permissions(&session, &[UserPermission::EmailerManage])?;

	let client = &ctx.db;

	let device = client
		.registered_email_device()
		.delete(registered_email_device::id::equals(id))
		.exec()
		.await?;

	Ok(Json(RegisteredEmailDevice::from(device)))
}
