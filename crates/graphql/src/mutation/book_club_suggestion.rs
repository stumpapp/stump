use async_graphql::{Context, Object, Result, ID};
use chrono::Utc;
use models::{
	entity::{
		book_club, book_club_book_suggestion, book_club_book_suggestion_like,
		book_club_member, user::AuthUser,
	},
	shared::book_club::{BookClubMemberRole, BookClubSuggestionStatus},
};
use sea_orm::{prelude::*, ActiveValue::Set, ColumnTrait, IntoActiveModel, QueryFilter};

use crate::{
	data::{AuthContext, CoreContext},
	input::book_club::SuggestBookInput,
	object::book_club_book_suggestion::BookClubBookSuggestion,
};

#[derive(Default)]
pub struct BookClubSuggestionMutation;

#[Object]
impl BookClubSuggestionMutation {
	/// Suggest a book for the book club
	async fn suggest_book(
		&self,
		ctx: &Context<'_>,
		book_club_id: ID,
		input: SuggestBookInput,
	) -> Result<BookClubBookSuggestion> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		book_club::Entity::find_by_id_and_user(book_club_id.as_ref(), user)
			.one(conn)
			.await?
			.ok_or("Book club not found or you don't have access")?;

		let member = get_member_for_user(book_club_id.as_ref(), user, conn).await?;

		if input.book_id.is_none() && (input.title.is_none() || input.author.is_none()) {
			return Err(
				"You must provide either a book_id or both title and author".into()
			);
		}

		let suggestion = book_club_book_suggestion::ActiveModel {
			id: Set(Uuid::new_v4().to_string()),
			book_club_id: Set(book_club_id.to_string()),
			book_id: Set(input.book_id),
			title: Set(input.title),
			author: Set(input.author),
			url: Set(input.url),
			notes: Set(input.notes),
			status: Set(BookClubSuggestionStatus::Pending),
			created_at: Set(DateTimeWithTimeZone::from(Utc::now())),
			suggested_by_id: Set(member.id.clone()),
			..Default::default()
		};

		let created_suggestion = suggestion.insert(conn).await?;

		// TODO: Emit some kind of event when event broker is implemented

		Ok(created_suggestion.into())
	}

	/// Remove your own suggestion (only before it's resolved)
	async fn remove_suggestion(
		&self,
		ctx: &Context<'_>,
		suggestion_id: ID,
	) -> Result<BookClubBookSuggestion> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let suggestion =
			book_club_book_suggestion::Entity::find_by_id(suggestion_id.as_ref())
				.one(conn)
				.await?
				.ok_or("Suggestion not found")?;

		let member = get_member_for_user(&suggestion.book_club_id, user, conn).await?;

		let can_remove = suggestion.suggested_by_id == member.id
			|| member.role >= BookClubMemberRole::Admin
			|| user.is_server_owner;

		if !can_remove {
			return Err("You can only remove your own suggestions".into());
		}

		if suggestion.resolved_at.is_some() {
			return Err("Cannot remove a suggestion that has been resolved".into());
		}

		let _result = suggestion.clone().delete(conn).await?;

		// TODO: Emit some kind of event when event broker is implemented

		Ok(suggestion.into())
	}

	/// Toggle like on a suggestion
	async fn toggle_suggestion_like(
		&self,
		ctx: &Context<'_>,
		suggestion_id: ID,
	) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let suggestion =
			book_club_book_suggestion::Entity::find_by_id(suggestion_id.as_ref())
				.one(conn)
				.await?
				.ok_or("Suggestion not found")?;

		let member = get_member_for_user(&suggestion.book_club_id, user, conn).await?;

		let existing_like = book_club_book_suggestion_like::Entity::find()
			.filter(
				book_club_book_suggestion_like::Column::SuggestionId
					.eq(suggestion_id.as_ref()),
			)
			.filter(book_club_book_suggestion_like::Column::LikedById.eq(&member.id))
			.one(conn)
			.await?;

		let liked = if let Some(like) = existing_like {
			like.delete(conn).await?;
			false
		} else {
			let like = book_club_book_suggestion_like::ActiveModel {
				timestamp: Set(DateTimeWithTimeZone::from(Utc::now())),
				liked_by_id: Set(member.id.clone()),
				suggestion_id: Set(suggestion_id.to_string()),
				..Default::default()
			};
			like.insert(conn).await?;
			true
		};

		// TODO: Emit some kind of event when event broker is implemented

		Ok(liked)
	}

	/// Update the status of a suggestion (Admin+)
	async fn update_suggestion_status(
		&self,
		ctx: &Context<'_>,
		suggestion_id: ID,
		status: BookClubSuggestionStatus,
		notes: Option<String>,
	) -> Result<BookClubBookSuggestion> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let suggestion =
			book_club_book_suggestion::Entity::find_by_id(suggestion_id.as_ref())
				.one(conn)
				.await?
				.ok_or("Suggestion not found")?;

		let member = get_member_for_user(&suggestion.book_club_id, user, conn).await?;

		if member.role < BookClubMemberRole::Admin && !user.is_server_owner {
			return Err("Only admins and above can update suggestion status".into());
		}

		let mut active_model = suggestion.into_active_model();
		active_model.status = Set(status);
		active_model.resolved_at = Set(Some(DateTimeWithTimeZone::from(Utc::now())));
		active_model.resolved_by_id = Set(Some(member.id.clone()));

		if let Some(notes_value) = notes {
			active_model.notes = Set(Some(notes_value));
		}

		let updated_suggestion = active_model.update(conn).await?;

		// TODO: Emit some kind of event when event broker is implemented

		Ok(updated_suggestion.into())
	}
}

/// Helper function to get the member record for a user in a book club
async fn get_member_for_user(
	book_club_id: &str,
	user: &AuthUser,
	conn: &DatabaseConnection,
) -> Result<book_club_member::Model> {
	book_club_member::Entity::find_by_club_for_user(user, book_club_id)
		.one(conn)
		.await?
		.ok_or("You must be a member of the book club to perform this action".into())
}
