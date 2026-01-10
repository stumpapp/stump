use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use models::entity::{book_club_member, user};
use sea_orm::{prelude::*, QuerySelect};

use crate::{data::CoreContext, object::user::User};

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct BookClubMember {
	#[graphql(flatten)]
	model: book_club_member::Model,
}

impl From<book_club_member::Model> for BookClubMember {
	fn from(model: book_club_member::Model) -> Self {
		Self { model }
	}
}

#[ComplexObject]
impl BookClubMember {
	async fn avatar_url(&self, ctx: &Context<'_>) -> Result<Option<String>> {
		let core = ctx.data::<CoreContext>()?;
		let user_avatar_url: Option<String> =
			user::Entity::find_by_id(self.model.user_id.clone())
				.select_only()
				.column(user::Column::AvatarUrl)
				.into_tuple()
				.one(core.conn.as_ref())
				.await?
				.ok_or_else(|| async_graphql::Error::new("User not found"))?;

		Ok(user_avatar_url)
	}

	async fn username(&self, ctx: &Context<'_>) -> Result<String> {
		if let Some(ref username) = self.model.display_name {
			return Ok(username.clone());
		}

		let core = ctx.data::<CoreContext>()?;

		let user_username: String = user::Entity::find_by_id(self.model.user_id.clone())
			.select_only()
			.column(user::Column::Username)
			.into_tuple()
			.one(core.conn.as_ref())
			.await?
			.ok_or_else(|| async_graphql::Error::new("User not found"))?;

		Ok(user_username)
	}

	async fn user(&self, ctx: &Context<'_>) -> Result<User> {
		let core = ctx.data::<CoreContext>()?;
		let model = user::Entity::find_by_id(self.model.user_id.clone())
			.one(core.conn.as_ref())
			.await?
			.ok_or_else(|| async_graphql::Error::new("User not found"))?;

		Ok(User::from(model))
	}
}
