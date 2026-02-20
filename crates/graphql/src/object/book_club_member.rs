use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use models::{
	entity::{book_club_member, user},
	shared::book_club::BookClubMemberRole,
};
use sea_orm::{prelude::*, QuerySelect};

use crate::{
	data::{CoreContext, ServiceContext},
	object::user::User,
};

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
		let service = ctx.data::<ServiceContext>()?;
		let user_avatar_path: Option<String> =
			user::Entity::find_by_id(self.model.user_id.clone())
				.select_only()
				.column(user::Column::AvatarPath)
				.into_tuple()
				.one(core.conn.as_ref())
				.await?
				.ok_or_else(|| async_graphql::Error::new("User not found"))?;

		if user_avatar_path.is_none() {
			return Ok(None);
		}

		Ok(Some(service.format_url(format!(
			"/api/v2/users/{}/avatar",
			self.model.user_id
		))))
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

	async fn is_creator(&self) -> bool {
		self.model.role == BookClubMemberRole::Creator
	}
}
