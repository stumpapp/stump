use async_graphql::InputObject;
use models::{entity::reading_list, shared::enums::EntityVisibility};
use sea_orm::ActiveValue::Set;

#[derive(InputObject)]
pub struct ReadingListInput {
	pub id: String,
	pub name: String,
	pub visibility: Option<EntityVisibility>,
	pub media_ids: Vec<String>,
}

impl ReadingListInput {
	pub fn into_active_model(self, user_id: &str) -> reading_list::ActiveModel {
		reading_list::ActiveModel {
			id: Set(self.id.clone()),
			name: Set(self.name.clone()),
			updated_at: Set(chrono::Utc::now().into()),
			visibility: Set(self
				.visibility
				.unwrap_or_default()
				.to_string()
				.to_uppercase()),
			creating_user_id: Set(user_id.to_string()),
			..Default::default()
		}
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::tests::common::*;

	#[test]
	fn test_readinglistinput_into_activemodel_default() {
		let input = ReadingListInput {
			id: "some_id".to_string(),
			name: "Some Name".to_string(),
			visibility: None,
			media_ids: vec![],
		};

		let user_id = "test_user";
		let model = input.into_active_model(user_id);

		assert_eq!(model.id.unwrap(), "some_id");
		assert_eq!(model.name.unwrap(), "Some Name");
		assert!(is_close_to_now(model.updated_at.unwrap().into()));
		assert_eq!(model.visibility.unwrap(), "PRIVATE");
		assert_eq!(model.creating_user_id.unwrap(), user_id);
	}

	#[test]
	fn test_readinglistinput_into_activemodel_with_visibility() {
		let input = ReadingListInput {
			id: "some_id".to_string(),
			name: "Some Name".to_string(),
			visibility: Some(EntityVisibility::Public), // Adjust as per your enum
			media_ids: vec![],
		};

		let user_id = "test_user";
		let model = input.into_active_model(user_id);

		assert_eq!(model.id.unwrap(), "some_id");
		assert_eq!(model.name.unwrap(), "Some Name");
		assert!(is_close_to_now(model.updated_at.unwrap().into()));
		assert_eq!(model.visibility.unwrap(), "PUBLIC");
		assert_eq!(model.creating_user_id.unwrap(), user_id);
	}
}
