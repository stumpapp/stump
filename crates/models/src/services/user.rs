use sea_orm::{
	ActiveModelTrait, ActiveValue::Set, DbErr, IntoActiveModel, TransactionSession,
	TransactionTrait,
};

use crate::entity::{age_restriction, user, user_preferences};

/// Age restriction params for the to-be-created user
pub struct NewAgeRestriction {
	pub age: i32,
	pub restrict_on_unset: bool,
}

// TODO: once the circular fk dep is removed i should be good to use nested active models here

/// Create a user along with their default preferences row (and optionally an age
/// restriction) in a single transaction
pub async fn create_user_with_preferences<C>(
	conn: &C,
	new_user: user::ActiveModel,
	age_restriction: Option<NewAgeRestriction>,
) -> Result<user::Model, DbErr>
where
	C: TransactionTrait,
{
	let txn = conn.begin().await?;

	let user_model = new_user.insert(&txn).await?;

	let preferences = user_preferences::ActiveModel {
		user_id: Set(Some(user_model.id.clone())),
		..Default::default()
	}
	.insert(&txn)
	.await?;

	let mut user_active = user_model.into_active_model();
	user_active.user_preferences_id = Set(Some(preferences.id));
	let user_model = user_active.update(&txn).await?;

	if let Some(restriction) = age_restriction {
		age_restriction::ActiveModel {
			user_id: Set(user_model.id.clone()),
			age: Set(restriction.age),
			restrict_on_unset: Set(restriction.restrict_on_unset),
			..Default::default()
		}
		.insert(&txn)
		.await?;
	}

	txn.commit().await?;

	Ok(user_model)
}
