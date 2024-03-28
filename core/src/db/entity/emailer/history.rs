use crate::{db::entity::User, CoreError};
use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::prisma::emailer_send_record;

/// The metadata of an attachment that was sent with an email
#[derive(Serialize, Deserialize, ToSchema, Type)]
pub struct AttachmentMeta {
	/// The filename of the attachment
	pub filename: String,
	/// The associated media ID of the attachment, if there is one
	pub media_id: Option<String>,
	/// The size of the attachment in bytes
	pub size: i32,
}

/// A record of an email that was sent, used to keep track of emails that
/// were sent by specific emailer(s)
#[derive(Serialize, Deserialize, ToSchema, Type)]
pub struct EmailerSendRecord {
	/// The ID of this record
	id: i32,
	/// The ID of the emailer that sent this email
	emailer_id: i32,
	/// The email of the recipient of this email
	recipient_email: String,
	/// The metadata of the attachment, if there is one
	attachment_meta: Option<AttachmentMeta>,
	/// The timestamp of when this email was sent
	sent_at: String,
	/// The user ID of the user that sent this email
	sent_by_user_id: Option<String>,
	/// The user that sent this email
	#[serde(skip_serializing_if = "Option::is_none")]
	sent_by: Option<User>,
}

impl TryFrom<emailer_send_record::Data> for EmailerSendRecord {
	type Error = CoreError;

	fn try_from(data: emailer_send_record::Data) -> Result<Self, Self::Error> {
		let sent_by = data.sent_by().ok().flatten().cloned().map(User::from);
		let attachment_meta = data.attachment_meta.as_deref().and_then(|data| {
			serde_json::from_slice(data).map_or_else(
				|error| {
					tracing::error!(?error, "Failed to deserialize attachment meta");
					None
				},
				Some,
			)
		});

		Ok(Self {
			id: data.id,
			emailer_id: data.emailer_id,
			recipient_email: data.recipient_email,
			attachment_meta,
			sent_at: data.sent_at.to_rfc3339(),
			sent_by_user_id: data.sent_by_user_id.map(|id| id.to_string()),
			sent_by,
		})
	}
}
