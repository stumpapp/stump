use async_graphql::InputObject;
use models::entity::registered_email_device;
use sea_orm::{NotSet, Set};

/// Input object for creating or updating an email device
#[derive(InputObject)]
pub struct EmailDeviceInput {
	/// The friendly name of the email device, e.g. "Aaron's Kobo"
	pub name: String,
	/// The email address of the device
	pub email: String,
	/// Whether the device is forbidden from receiving emails from the server.
	pub forbidden: bool,
}

impl EmailDeviceInput {
	/// Converts the input object into an active model for database operations
	pub fn into_active_model(self) -> registered_email_device::ActiveModel {
		registered_email_device::ActiveModel {
			id: NotSet, // auto-incremented
			name: Set(self.name),
			email: Set(self.email),
			forbidden: Set(self.forbidden),
		}
	}
}

#[derive(InputObject)]
pub struct PatchEmailDeviceInput {
	pub name: Option<String>,
	pub email: Option<String>,
	pub forbidden: Option<bool>,
}

impl PatchEmailDeviceInput {
	pub fn apply(
		self,
		existing: registered_email_device::Model,
	) -> registered_email_device::ActiveModel {
		registered_email_device::ActiveModel {
			id: Set(existing.id),
			name: match self.name {
				Some(name) => Set(name),
				None => Set(existing.name),
			},
			email: match self.email {
				Some(email) => Set(email),
				None => Set(existing.email),
			},
			forbidden: match self.forbidden {
				Some(forbidden) => Set(forbidden),
				None => Set(existing.forbidden),
			},
		}
	}
}
