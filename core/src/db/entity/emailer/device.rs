use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::prisma::registered_email_device;

#[derive(Serialize, Deserialize, ToSchema, Type)]
pub struct RegisteredEmailDevice {
	id: i32,
	name: String,
	email: String,
	forbidden: bool,
}

impl From<registered_email_device::Data> for RegisteredEmailDevice {
	fn from(data: registered_email_device::Data) -> Self {
		Self {
			id: data.id,
			name: data.name,
			email: data.email,
			forbidden: data.forbidden,
		}
	}
}
