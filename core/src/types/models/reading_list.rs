use serde::{Deserialize, Serialize};
use user::{User};
use specta::Type;

use crate::prisma;

// TODO
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ReadingList {
	pub id: String,
	pub name: String,
	pub description: String,
    pub creating_user: User,
}