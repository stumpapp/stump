use async_graphql::{ComplexObject, SimpleObject};

use models::{entity::user_preferences, shared::arrangement::Arrangement};

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct UserPreferences {
	#[graphql(flatten)]
	pub model: user_preferences::Model,
}

impl From<user_preferences::Model> for UserPreferences {
	fn from(entity: user_preferences::Model) -> Self {
		Self { model: entity }
	}
}

#[ComplexObject]
impl UserPreferences {
	async fn home_arrangement(&self) -> Arrangement {
		self.model.resolved_home_arrangement()
	}

	async fn navigation_arrangement(&self) -> Arrangement {
		self.model.resolved_navigation_arrangement()
	}
}
