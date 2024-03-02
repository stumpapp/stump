use axum::{
	extract::{Path, State},
	middleware::from_extractor_with_state,
	routing::get,
	Json, Router,
};
use serde::Deserialize;
use specta::Type;
use stump_core::{
	db::entity::{
		EmailerConfig, EmailerConfigInput, RegisteredEmailDevice, SMTPEmailer,
		UserPermission,
	},
	prisma::{emailer, registered_email_device},
};
use tower_sessions::Session;
use utoipa::ToSchema;

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	filter::chain_optional_iter,
	middleware::auth::Auth,
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
					Router::new().route(
						"/",
						get(get_emailer_by_id)
							.put(update_emailer)
							// .patch(patch_emailer)
							.delete(delete_emailer),
					),
				),
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
			config.encrypted_password,
			config.smtp_host.as_relay().to_string(),
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
				emailer::encrypted_password::set(config.encrypted_password),
				emailer::smtp_host::set(config.smtp_host.as_relay().to_string()),
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
