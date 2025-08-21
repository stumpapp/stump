use async_graphql::{Context, Object, Result, ID};
use models::{
	entity::{book_club, user::AuthUser},
	shared::{book_club::BookClubMemberRole, enums::UserPermission},
};
use sea_orm::{prelude::*, IntoActiveModel, TransactionTrait};

use crate::{
	data::{AuthContext, CoreContext},
	guard::PermissionGuard,
	input::book_club::{CreateBookClubInput, UpdateBookClubInput},
	object::book_club::BookClub,
};

#[derive(Default)]
pub struct BookClubMutation;

#[Object]
impl BookClubMutation {
	#[graphql(guard = "PermissionGuard::one(UserPermission::CreateBookClub)")]
	async fn create_book_club(
		&self,
		ctx: &Context<'_>,
		input: CreateBookClubInput,
	) -> Result<BookClub> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let txn = conn.begin().await?;

		let (club, member) = input.into_active_model(user);

		let created_club = club.insert(&txn).await?;
		let _created_member = member.insert(&txn).await?;

		txn.commit().await?;

		Ok(created_club.into())
	}

	async fn update_book_club(
		&self,
		ctx: &Context<'_>,
		id: ID,
		input: UpdateBookClubInput,
	) -> Result<BookClub> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let book_club = get_book_club_for_admin(user, &id, conn)
			.await?
			.ok_or("Book club not found or you lack permission to update")?;

		let active_model = input.apply(book_club.into_active_model());
		let updated_club = active_model.update(conn).await?;
		Ok(updated_club.into())
	}
}

pub async fn get_book_club_for_admin(
	user: &AuthUser,
	id: &ID,
	conn: &DatabaseConnection,
) -> Result<Option<book_club::Model>> {
	Ok(book_club::Entity::find_for_member_enforce_role_and_id(
		user,
		BookClubMemberRole::Admin,
		id.as_ref(),
	)
	.one(conn)
	.await?)
}

#[cfg(test)]
mod tests {
	use crate::tests::common::*;

	use super::*;
	use pretty_assertions::assert_eq;

	fn get_default_book_club() -> book_club::Model {
		book_club::Model {
			id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa".to_string(),
			name: "Test".to_string(),
			description: None,
			is_private: false,
			member_role_spec: None,
			created_at: chrono::Utc::now().into(),
			emoji: None,
		}
	}

	#[tokio::test]
	async fn get_book_club_for_admin_no_result() {
		let book_club = get_default_book_club();
		let id: ID = book_club.id.clone().into();
		let user = get_default_user();
		let conn = get_mock_db_for_model::<book_club::Model>(vec![]).into_connection();

		let result = get_book_club_for_admin(&user, &id, &conn).await.unwrap();
		assert_eq!(result, None);
	}

	#[tokio::test]
	async fn get_book_club_for_admin_valid() {
		let book_club = get_default_book_club();
		let id: ID = book_club.id.clone().into();
		let user = get_default_user();
		let conn = get_mock_db_for_model(vec![book_club.clone()]).into_connection();

		let result = get_book_club_for_admin(&user, &id, &conn).await.unwrap();
		assert_eq!(result, Some(book_club));
	}
}
