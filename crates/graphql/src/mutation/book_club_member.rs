use async_graphql::{Context, Object, Result, ID};
use sea_orm::prelude::*;

use crate::{
	data::CoreContext, input::book_club::CreateBookClubMemberInput,
	object::book_club_member::BookClubMember,
};

#[derive(Default)]
pub struct BookClubMemberMutation;

#[Object]
impl BookClubMemberMutation {
	async fn create_book_club_member(
		&self,
		ctx: &Context<'_>,
		book_club_id: ID,
		input: CreateBookClubMemberInput,
	) -> Result<BookClubMember> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let created_member = input
			.into_active_model(&book_club_id.to_string())
			.insert(conn)
			.await?;

		Ok(BookClubMember::from(created_member))
	}
}
