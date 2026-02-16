use async_graphql::{Context, Object, Result, ID};
use chrono::Utc;
use models::{
	entity::{
		book_club_book, book_club_discussion, book_club_discussion_message,
		book_club_discussion_message_like, book_club_member, user::AuthUser,
	},
	shared::book_club::BookClubMemberRole,
};
use sea_orm::{prelude::*, ActiveValue::Set, ColumnTrait, IntoActiveModel, QueryFilter};

use crate::{
	data::{AuthContext, CoreContext},
	input::book_club::{BookClubDiscussionInput, EditMessageInput, SendMessageInput},
	object::{
		book_club_discussion::BookClubDiscussion,
		book_club_discussion_message::BookClubDiscussionMessage,
	},
};

#[derive(Default)]
pub struct BookClubDiscussionMutation;

#[Object]
impl BookClubDiscussionMutation {
	/// Send a message in a discussion
	async fn send_message(
		&self,
		ctx: &Context<'_>,
		discussion_id: ID,
		input: SendMessageInput,
	) -> Result<BookClubDiscussionMessage> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let discussion = book_club_discussion::Entity::find_by_id(discussion_id.as_ref())
			.one(conn)
			.await?
			.ok_or("Discussion not found")?;

		if discussion.is_locked {
			return Err("Discussion is locked".into());
		}

		let member = get_member_for_user(&discussion.book_club_id, user, conn).await?;

		if let Some(ref parent_id) = input.parent_message_id {
			let parent_exists =
				book_club_discussion_message::Entity::find_by_id(parent_id)
					.filter(
						book_club_discussion_message::Column::DiscussionId
							.eq(&discussion.id),
					)
					.filter(book_club_discussion_message::Column::DeletedAt.is_null())
					.one(conn)
					.await?
					.is_some();

			if !parent_exists {
				return Err("Parent message not found or deleted".into());
			}
		}

		let message = book_club_discussion_message::ActiveModel {
			id: Set(Uuid::new_v4().to_string()),
			content: Set(input.content),
			timestamp: Set(DateTimeWithTimeZone::from(Utc::now())),
			parent_message_id: Set(input.parent_message_id),
			discussion_id: Set(discussion.id.clone()),
			member_id: Set(Some(member.id.clone())),
			is_pinned_message: Set(false),
			book_club_id: Set(discussion.book_club_id.clone()),
			..Default::default()
		};

		let created_message = message.insert(conn).await?;

		// TODO: Emit some kind of message event when event broker is implemented

		Ok(created_message.into())
	}

	/// Edit your own message
	async fn edit_message(
		&self,
		ctx: &Context<'_>,
		message_id: ID,
		input: EditMessageInput,
	) -> Result<BookClubDiscussionMessage> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let message =
			book_club_discussion_message::Entity::find_by_id(message_id.as_ref())
				.one(conn)
				.await?
				.ok_or("Message not found")?;

		if message.deleted_at.is_some() {
			return Err("Cannot edit a deleted message".into());
		}

		let discussion = book_club_discussion::Entity::find_by_id(&message.discussion_id)
			.one(conn)
			.await?
			.ok_or("Discussion not found")?;

		if discussion.is_locked {
			return Err("Discussion is locked".into());
		}

		let member = get_member_for_user(&discussion.book_club_id, user, conn).await?;

		let can_edit = message.member_id.as_ref() == Some(&member.id)
			|| member.role >= BookClubMemberRole::Moderator
			|| user.is_server_owner;

		if !can_edit {
			return Err("You can only edit your own messages".into());
		}

		let mut active_model = message.into_active_model();
		active_model.content = Set(input.content);
		active_model.edited_at = Set(Some(DateTimeWithTimeZone::from(Utc::now())));

		let updated_message = active_model.update(conn).await?;

		// TODO: Emit some kind of message event when event broker is implemented

		Ok(updated_message.into())
	}

	/// Delete (soft delete) your own message
	async fn delete_message(
		&self,
		ctx: &Context<'_>,
		message_id: ID,
	) -> Result<BookClubDiscussionMessage> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let message =
			book_club_discussion_message::Entity::find_by_id(message_id.as_ref())
				.one(conn)
				.await?
				.ok_or("Message not found")?;

		if message.deleted_at.is_some() {
			return Err("Message is already deleted".into());
		}

		let discussion = book_club_discussion::Entity::find_by_id(&message.discussion_id)
			.one(conn)
			.await?
			.ok_or("Discussion not found")?;

		let member = get_member_for_user(&discussion.book_club_id, user, conn).await?;

		let can_delete = message.member_id.as_ref() == Some(&member.id)
			|| member.role >= BookClubMemberRole::Moderator
			|| user.is_server_owner;

		if !can_delete {
			return Err("You can only delete your own messages".into());
		}

		let mut active_model = message.into_active_model();
		active_model.deleted_at = Set(Some(Utc::now().to_rfc3339()));

		let deleted_message = active_model.update(conn).await?;

		// TODO: Emit some kind of message event when event broker is implemented

		Ok(deleted_message.into())
	}

	/// Toggle like on a message
	async fn toggle_message_like(
		&self,
		ctx: &Context<'_>,
		message_id: ID,
	) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let message =
			book_club_discussion_message::Entity::find_by_id(message_id.as_ref())
				.one(conn)
				.await?
				.ok_or("Message not found")?;

		if message.deleted_at.is_some() {
			return Err("Cannot like a deleted message".into());
		}

		let discussion = book_club_discussion::Entity::find_by_id(&message.discussion_id)
			.one(conn)
			.await?
			.ok_or("Discussion not found")?;

		let member = get_member_for_user(&discussion.book_club_id, user, conn).await?;

		let existing_like = book_club_discussion_message_like::Entity::find()
			.filter(
				book_club_discussion_message_like::Column::MessageId
					.eq(message_id.as_ref()),
			)
			.filter(book_club_discussion_message_like::Column::LikedById.eq(&member.id))
			.one(conn)
			.await?;

		let liked = if let Some(like) = existing_like {
			like.delete(conn).await?;
			false
		} else {
			let like = book_club_discussion_message_like::ActiveModel {
				id: Set(Uuid::new_v4().to_string()),
				timestamp: Set(DateTimeWithTimeZone::from(Utc::now())),
				liked_by_id: Set(member.id.clone()),
				message_id: Set(message_id.to_string()),
			};
			like.insert(conn).await?;
			true
		};

		// TODO: Emit some kind of message event when event broker is implemented

		Ok(liked)
	}

	/// Lock or unlock a discussion (Moderator+)
	async fn lock_discussion(
		&self,
		ctx: &Context<'_>,
		discussion_id: ID,
		locked: bool,
	) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let discussion = book_club_discussion::Entity::find_by_id(discussion_id.as_ref())
			.one(conn)
			.await?
			.ok_or("Discussion not found")?;

		let member = get_member_for_user(&discussion.book_club_id, user, conn).await?;

		if member.role < BookClubMemberRole::Moderator && !user.is_server_owner {
			return Err("Only moderators and above can lock/unlock discussions".into());
		}

		let mut active_model = discussion.into_active_model();
		active_model.is_locked = Set(locked);

		active_model.update(conn).await?;

		// TODO: Emit some kind of event when event broker is implemented

		Ok(locked)
	}

	/// Pin or unpin a message (Moderator+)
	async fn pin_message(
		&self,
		ctx: &Context<'_>,
		message_id: ID,
		pinned: bool,
	) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let message =
			book_club_discussion_message::Entity::find_by_id(message_id.as_ref())
				.one(conn)
				.await?
				.ok_or("Message not found")?;

		if message.deleted_at.is_some() {
			return Err("Cannot pin a deleted message".into());
		}

		let discussion = book_club_discussion::Entity::find_by_id(&message.discussion_id)
			.one(conn)
			.await?
			.ok_or("Discussion not found")?;

		let member = get_member_for_user(&discussion.book_club_id, user, conn).await?;

		if member.role < BookClubMemberRole::Moderator && !user.is_server_owner {
			return Err("Only moderators and above can pin/unpin messages".into());
		}

		let mut active_model = message.into_active_model();
		active_model.is_pinned_message = Set(pinned);

		active_model.update(conn).await?;

		// TODO: Emit some kind of event when event broker is implemented

		Ok(pinned)
	}

	/// Manually create a discussion for a book
	async fn create_discussion(
		&self,
		ctx: &Context<'_>,
		book_club_id: ID,
		input: BookClubDiscussionInput,
	) -> Result<BookClubDiscussion> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let member = get_member_for_user(book_club_id.as_ref(), user, conn).await?;

		if member.role < BookClubMemberRole::Moderator && !user.is_server_owner {
			return Err("Only moderators and above can create discussions".into());
		}

		if let Some(ref bcb_id) = input.book_club_book_id {
			let book = book_club_book::Entity::find_by_id(bcb_id.as_ref())
				.one(conn)
				.await?
				.ok_or("Book not found")?;

			if book.book_club_id != book_club_id.as_ref() {
				return Err("Book does not belong to this book club".into());
			}

			let existing = book_club_discussion::Entity::find()
				.filter(book_club_discussion::Column::BookClubBookId.eq(bcb_id.as_ref()))
				.one(conn)
				.await?;

			if existing.is_some() {
				return Err("A discussion already exists for this book".into());
			}
		}

		let discussion = book_club_discussion::ActiveModel {
			is_locked: Set(false),
			is_archived: Set(false),
			book_club_book_id: Set(input.book_club_book_id.map(|id| id.to_string())),
			title: Set(input.title),
			is_pinned: Set(input.is_pinned),
			created_at: Set(DateTimeWithTimeZone::from(Utc::now())),
			book_club_id: Set(book_club_id.to_string()),
			..Default::default()
		};

		let created_discussion = discussion.insert(conn).await?;

		Ok(BookClubDiscussion::from(created_discussion))
	}

	/// Archive or unarchive a discussion (Moderator+)
	async fn archive_discussion(
		&self,
		ctx: &Context<'_>,
		discussion_id: ID,
		archived: bool,
	) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let discussion = book_club_discussion::Entity::find_by_id(discussion_id.as_ref())
			.one(conn)
			.await?
			.ok_or("Discussion not found")?;

		let member = get_member_for_user(&discussion.book_club_id, user, conn).await?;

		if member.role < BookClubMemberRole::Moderator && !user.is_server_owner {
			return Err(
				"Only moderators and above can archive/unarchive discussions".into(),
			);
		}

		let mut active_model = discussion.into_active_model();
		active_model.is_archived = Set(archived);

		active_model.update(conn).await?;

		Ok(archived)
	}
}

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

pub async fn create_general_discussion<C>(
	book_club_id: &str,
	conn: &C,
) -> Result<book_club_discussion::Model>
where
	C: ConnectionTrait,
{
	let discussion = book_club_discussion::ActiveModel {
		is_locked: Set(false),
		is_archived: Set(false),
		book_club_book_id: Set(None),
		title: Set(Some("General".to_string())),
		is_pinned: Set(true),
		created_at: Set(DateTimeWithTimeZone::from(Utc::now())),
		book_club_id: Set(book_club_id.to_string()),
		..Default::default()
	};

	let created = discussion.insert(conn).await?;
	Ok(created)
}
