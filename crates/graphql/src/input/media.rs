use async_graphql::{InputObject, OneofObject};
use models::entity::{bookmark, user::AuthUser};
use sea_orm::{prelude::*, ActiveValue::Set};

#[derive(Debug, Clone, InputObject)]
pub struct EpubProgressInput {
	pub epubcfi: String,
	pub percentage: Decimal,
	pub is_complete: Option<bool>,
	pub elapsed_seconds: Option<i64>,
}

#[derive(Debug, Clone, InputObject)]
pub struct PagedProgressInput {
	pub page: i32,
	pub elapsed_seconds: Option<i64>,
}

#[derive(Debug, Clone, OneofObject)]
pub enum MediaProgressInput {
	Epub(EpubProgressInput),
	Paged(PagedProgressInput),
}

#[derive(InputObject)]
pub struct BookmarkInput {
	pub media_id: String,
	pub epubcfi: String,
	pub preview_content: Option<String>,
}

impl BookmarkInput {
	pub fn into_active_model(&self, user: &AuthUser) -> bookmark::ActiveModel {
		bookmark::ActiveModel {
			id: Set(Uuid::new_v4().to_string()),
			epubcfi: Set(Some(self.epubcfi.clone())),
			preview_content: Set(self.preview_content.clone()),
			media_id: Set(self.media_id.clone()),
			user_id: Set(user.id.clone()),
			page: Set(Some(-1)),
		}
	}
}
