use async_graphql::{Context, Object, Result, ID};
use models::entity::book_club;
use sea_orm::prelude::*;

use crate::{
	data::{CoreContext, RequestContext},
	object::book_club::BookClub,
};

#[derive(Default)]
pub struct BookClubQuery;

#[Object]
impl BookClubQuery {
	async fn book_clubs(
		&self,
		ctx: &Context<'_>,
		#[graphql(default)] all: Option<bool>,
	) -> Result<Vec<BookClub>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let query = if all.unwrap_or(false) {
			book_club::Entity::find_for_user(user)
		} else {
			book_club::Entity::find_for_member_user(user)
		};

		let models = query.all(conn).await?;

		Ok(models.into_iter().map(BookClub::from).collect())
	}

	async fn book_club_by_id(
		&self,
		ctx: &Context<'_>,
		id: ID,
	) -> Result<Option<BookClub>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let model = book_club::Entity::find_for_user(user)
			.filter(book_club::Column::Id.eq(id.to_string()))
			.one(conn)
			.await?;

		Ok(model.map(BookClub::from))
	}
}
