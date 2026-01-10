use async_graphql::{ComplexObject, Context, Result, SimpleObject};

use models::entity::{user, user_login_activity};
use sea_orm::prelude::*;

use crate::{data::CoreContext, object::user::User};

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct UserLoginActivity {
	#[graphql(flatten)]
	pub model: user_login_activity::Model,
}

impl From<user_login_activity::Model> for UserLoginActivity {
	fn from(entity: user_login_activity::Model) -> Self {
		Self { model: entity }
	}
}

#[ComplexObject]
impl UserLoginActivity {
	async fn user(&self, ctx: &Context<'_>) -> Result<User> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let first = user::Entity::find()
			.filter(user::Column::Id.eq(self.model.user_id.clone()))
			.one(conn)
			.await?
			.unwrap();

		Ok(User::from(first))
	}
}
