use std::path::PathBuf;

use axum::{
	extract::{Path, State},
	middleware,
	routing::{get, post},
	Extension, Json, Router,
};
use prisma_client_rust::{chrono::Utc, Direction};
use serde::{Deserialize, Serialize};
use serde_qs::axum::QsQuery;
use specta::Type;
use stump_core::{
	db::entity::{
		AttachmentMeta, EmailerConfig, EmailerConfigInput, EmailerSendRecord,
		EmailerSendTo, Media, Notifier, RegisteredEmailDevice, SMTPEmailer, User,
		UserPermission,
	},
	filesystem::{ContentType, FileParts, PathUtils},
	prisma::{emailer, emailer_send_record, registered_email_device, user, PrismaClient},
	AttachmentPayload, EmailContentType,
};
use tokio::fs;

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	filter::{chain_optional_iter, MediaFilter},
	middleware::auth::{auth_middleware, AuthContext},
	routers::api::filters::apply_media_filters_for_user,
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.nest(
			"/emailers",
			Router::new()
				.route("/", get(get_emailers).post(create_emailer))
				.nest(
					"/{id}",
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
					"/{id}",
					Router::new().route(
						"/",
						get(get_email_device_by_id)
							.put(update_email_device)
							.patch(patch_email_device)
							.delete(delete_email_device),
					),
				),
		)
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
}

#[derive(Deserialize, Type)]
pub struct EmailerIncludeParams {
	#[serde(default)]
	pub include_send_history: bool,
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
	QsQuery(include_params): QsQuery<EmailerIncludeParams>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<Vec<SMTPEmailer>>> {
	req.enforce_permissions(&[UserPermission::EmailerRead])?;

	let client = &ctx.db;

	let mut query = client.emailer().find_many(vec![]);

	// TODO: consider auto truncating?
	if include_params.include_send_history {
		query = query.with(emailer::send_history::fetch(vec![]));
	}

	let emailers = query
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
	path = "/api/v1/emailers/{id}",
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
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<SMTPEmailer>> {
	req.enforce_permissions(&[UserPermission::EmailerRead])?;

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
#[derive(Deserialize, Type)]
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
	Extension(req): Extension<AuthContext>,
	Json(payload): Json<CreateOrUpdateEmailer>,
) -> APIResult<Json<SMTPEmailer>> {
	req.enforce_permissions(&[UserPermission::EmailerCreate])?;

	let client = &ctx.db;

	let config = EmailerConfig::from_client_config(payload.config, &ctx).await?;
	let emailer = client
		.emailer()
		.create(
			payload.name,
			config.sender_email,
			config.sender_display_name,
			config.username,
			config
				.encrypted_password
				.ok_or(APIError::InternalServerError(
					"Encrypted password is missing".to_string(),
				))?,
			config.smtp_host.to_string(),
			config.smtp_port.into(),
			vec![
				emailer::is_primary::set(payload.is_primary),
				emailer::tls_enabled::set(config.tls_enabled),
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
	path = "/api/v1/emailers/{id}",
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
	Extension(req): Extension<AuthContext>,
	Json(payload): Json<CreateOrUpdateEmailer>,
) -> APIResult<Json<SMTPEmailer>> {
	req.enforce_permissions(&[UserPermission::EmailerManage])?;

	if payload.config.password.is_some() {
		tracing::warn!(?id, "The password for the emailer is being updated!");
	}

	let client = &ctx.db;
	let config = EmailerConfig::from_client_config(payload.config, &ctx).await?;
	let updated_emailer = client
		.emailer()
		.update(
			emailer::id::equals(id),
			chain_optional_iter(
				[
					emailer::name::set(payload.name),
					emailer::sender_email::set(config.sender_email),
					emailer::sender_display_name::set(config.sender_display_name),
					emailer::username::set(config.username),
					emailer::smtp_host::set(config.smtp_host.to_string()),
					emailer::smtp_port::set(config.smtp_port.into()),
					emailer::tls_enabled::set(config.tls_enabled),
					emailer::max_attachment_size_bytes::set(
						config.max_attachment_size_bytes,
					),
				],
				[config
					.encrypted_password
					.map(emailer::encrypted_password::set)],
			),
		)
		.exec()
		.await?;
	Ok(Json(SMTPEmailer::try_from(updated_emailer)?))
}

// #[derive(Deserialize, Type)]
// pub struct PatchEmailer {}

// #[utoipa::path(
//     patch,
//     path = "/api/v1/emailers/{id}/",
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
// 	Extension(req): Extension<AuthContext>,
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
	path = "/api/v1/emailers/{id}/",
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
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<SMTPEmailer>> {
	req.enforce_permissions(&[UserPermission::EmailerManage])?;

	let client = &ctx.db;

	let deleted_emailer = client
		.emailer()
		.delete(emailer::id::equals(id))
		.exec()
		.await?;

	Ok(Json(SMTPEmailer::try_from(deleted_emailer)?))
}

#[derive(Debug, Deserialize, Type)]
pub struct EmailerSendRecordIncludeParams {
	#[serde(default)]
	include_sent_by: bool,
}

#[utoipa::path(
	get,
	path = "/api/v1/emailers/{id}/send-history",
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
	State(ctx): State<AppState>,
	Path(emailer_id): Path<i32>,
	QsQuery(include_params): QsQuery<EmailerSendRecordIncludeParams>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<Vec<EmailerSendRecord>>> {
	tracing::trace!(?emailer_id, ?include_params, "get_emailer_send_history");
	req.enforce_permissions(&[UserPermission::EmailerRead])?;

	let client = &ctx.db;

	let mut query = client
		.emailer_send_record()
		.find_many(vec![emailer_send_record::emailer_id::equals(emailer_id)]);

	if include_params.include_sent_by {
		query = query.with(emailer_send_record::sent_by::fetch());
	}

	let history = query
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

#[derive(Deserialize, Type)]
pub struct SendAttachmentEmailsPayload {
	media_ids: Vec<String>,
	send_to: Vec<EmailerSendTo>,
}

#[derive(Serialize, Type)]
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
	Extension(req): Extension<AuthContext>,
	Json(payload): Json<SendAttachmentEmailsPayload>,
) -> APIResult<Json<SendAttachmentEmailResponse>> {
	let by_user = req.user_and_enforce_permissions(&chain_optional_iter(
		[UserPermission::EmailSend],
		[payload
			.send_to
			.iter()
			.any(|to| matches!(to, EmailerSendTo::Anonymous { .. }))
			.then_some(UserPermission::EmailArbitrarySend)],
	))?;

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
		let content = fs::read(book.path).await?;

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
					recipient,
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
	// Note: create_many threw a strange error...
	let audit_result = client
		._batch(record_creates.into_iter().map(|(eid, recipient, params)| {
			client.emailer_send_record().create(
				emailer::id::equals(eid),
				recipient,
				params,
			)
		}))
		.await;
	if let Err(error) = audit_result {
		tracing::error!(?error, "Failed to create emailer send records!");
		errors.push(format!("Failed to create emailer send records: {}", error));
	}

	let updated_emailer_result = client
		.emailer()
		.update(
			emailer::id::equals(emailer_id),
			vec![emailer::last_used_at::set(Some(Utc::now().into()))],
		)
		.exec()
		.await;
	if let Err(error) = updated_emailer_result {
		tracing::error!(?error, "Failed to update emailer last used at!");
		errors.push(format!("Failed to update emailer last used at: {}", error));
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
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<Vec<RegisteredEmailDevice>>> {
	req.enforce_permissions(&[UserPermission::EmailSend])?;

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
    path = "/api/v1/email-devices/{id}",
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
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<RegisteredEmailDevice>> {
	req.enforce_permissions(&[UserPermission::EmailSend])?;

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
#[derive(Deserialize, Type)]
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
	Extension(req): Extension<AuthContext>,
	Json(payload): Json<CreateOrUpdateEmailDevice>,
) -> APIResult<Json<RegisteredEmailDevice>> {
	req.enforce_permissions(&[UserPermission::EmailerManage])?;

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
    path = "/api/v1/email-devices/{id}",
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
	Extension(req): Extension<AuthContext>,
	Json(payload): Json<CreateOrUpdateEmailDevice>,
) -> APIResult<Json<RegisteredEmailDevice>> {
	req.enforce_permissions(&[UserPermission::EmailerManage])?;

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
#[derive(Deserialize, Type)]
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
    path = "/api/v1/email-devices/{id}",
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
	Extension(req): Extension<AuthContext>,
	Json(payload): Json<PatchEmailDevice>,
) -> APIResult<Json<RegisteredEmailDevice>> {
	req.enforce_permissions(&[UserPermission::EmailerManage])?;

	let client = &ctx.db;

	let device = client
		.registered_email_device()
		.update(
			registered_email_device::id::equals(id),
			chain_optional_iter(
				[],
				[
					payload.name.map(registered_email_device::name::set),
					payload.email.map(registered_email_device::email::set),
					payload
						.forbidden
						.map(registered_email_device::forbidden::set),
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
    path = "/api/v1/email-devices/{id}",
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
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<RegisteredEmailDevice>> {
	req.enforce_permissions(&[UserPermission::EmailerManage])?;

	let client = &ctx.db;

	let device = client
		.registered_email_device()
		.delete(registered_email_device::id::equals(id))
		.exec()
		.await?;

	Ok(Json(RegisteredEmailDevice::from(device)))
}
