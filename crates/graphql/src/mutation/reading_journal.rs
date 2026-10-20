use async_graphql::{Context, Object, Result};
use models::entity::{journal_entry, reading_session};
use sea_orm::{prelude::*, sea_query::OnConflict, ActiveValue::Set, IntoActiveModel};

use crate::data::{AuthContext, CoreContext};

/// A mutation root for reading journal entries
#[derive(Default)]
pub struct ReadingJournalMutation;

#[Object]
impl ReadingJournalMutation {
	/// Upserts a reading journal entry for the authenticated user and the given reading session
	async fn upsert_reading_session_journal_entry(
		&self,
		ctx: &Context<'_>,
		session_id: i32,
		content: String,
	) -> Result<journal_entry::Model> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let Some(session) = reading_session::Entity::find_for_user(user)
			.filter(reading_session::Column::Id.eq(session_id))
			.one(conn)
			.await?
		else {
			return Err("Session not found".into());
		};

		let entry = journal_entry::ActiveModel {
			session_id: Set(Some(session.id)),
			content: Set(content),
			media_id: Set(session.media_id.clone()),
			user_id: Set(user.id.clone()),
			..Default::default()
		};

		let upserted_entry = journal_entry::Entity::insert(entry)
			.on_conflict(
				OnConflict::columns([journal_entry::Column::SessionId])
					.update_columns([
						journal_entry::Column::Content,
						journal_entry::Column::UpdatedAt,
					])
					.to_owned(),
			)
			.exec_with_returning(conn)
			.await?;

		Ok(upserted_entry)
	}

	/// Deletes a reading journal entry for the authenticated user
	async fn delete_journal_entry(
		&self,
		ctx: &Context<'_>,
		entry_id: i32,
	) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let Some(entry) = journal_entry::Entity::find_for_user(user)
			.filter(journal_entry::Column::Id.eq(entry_id))
			.one(conn)
			.await?
		else {
			return Err("Journal entry not found".into());
		};

		entry.into_active_model().delete(conn).await?;

		Ok(true)
	}
}
