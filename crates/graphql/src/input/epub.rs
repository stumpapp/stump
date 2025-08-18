use async_graphql::InputObject;
use chrono::{DateTime, FixedOffset};
use models::entity::{
	bookmark, finished_reading_session, reading_session, user::AuthUser,
};
use sea_orm::{prelude::*, ActiveValue::Set};

#[derive(InputObject)]
pub struct BookmarkInput {
	pub media_id: String,
	pub epubcfi: String,
	pub preview_content: Option<String>,
}

#[derive(InputObject)]
pub struct EpubProgressInput {
	pub epubcfi: String,
	pub percentage: Decimal,
	pub is_complete: Option<bool>,
	pub elapsed_seconds: Option<i64>,
}

impl EpubProgressInput {
	pub fn into_finished_session_active_model(
		&self,
		id: String,
		user: &AuthUser,
		started_at: DateTime<FixedOffset>,
	) -> finished_reading_session::ActiveModel {
		finished_reading_session::ActiveModel {
			started_at: Set(started_at),
			media_id: Set(id),
			user_id: Set(user.id.clone()),
			completed_at: Set(chrono::Utc::now().into()),
			elapsed_seconds: Set(self.elapsed_seconds),
			..Default::default()
		}
	}

	pub fn into_reading_session_active_model(
		&self,
		id: String,
		user: &AuthUser,
	) -> reading_session::ActiveModel {
		reading_session::ActiveModel {
			epubcfi: Set(Some(self.epubcfi.clone())),
			percentage_completed: Set(Some(self.percentage)),
			media_id: Set(id),
			user_id: Set(user.id.clone()),
			updated_at: Set(Some(chrono::Utc::now().into())),
			elapsed_seconds: Set(self.elapsed_seconds),
			..Default::default()
		}
	}
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

#[cfg(test)]
mod tests {
	use sea_orm::MockDatabase;

	use super::*;
	use crate::tests::common::*;

	#[test]
	fn test_reading_session() {
		let user = get_default_user();
		let input = EpubProgressInput {
			epubcfi: "epubcfi".to_string(),
			percentage: Decimal::new(5, 1),
			is_complete: Some(true),
			elapsed_seconds: Some(60),
		};
		let active_model =
			input.into_reading_session_active_model("media_id".to_string(), &user);
		assert_eq!(active_model.media_id.unwrap(), "media_id");
		assert_eq!(active_model.epubcfi.unwrap(), Some("epubcfi".to_string()));
		assert_eq!(
			active_model.percentage_completed.unwrap(),
			Some(Decimal::new(5, 1))
		);
	}

	#[tokio::test]
	async fn test_finished_session() {
		let user = get_default_user();
		let input = EpubProgressInput {
			epubcfi: "epubcfi".to_string(),
			percentage: Decimal::new(1, 0),
			is_complete: Some(false),
			elapsed_seconds: Some(120),
		};
		let db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite).into_connection();
		let active_model = input.into_finished_session_active_model(
			"media_id".to_string(),
			&user,
			chrono::Utc::now().into(),
		);
		let active_model = active_model.before_save(&db, true).await.unwrap();
		assert_eq!(active_model.media_id.unwrap(), "media_id");
		assert!(is_close_to_now(active_model.completed_at.unwrap().into()));
	}
}
