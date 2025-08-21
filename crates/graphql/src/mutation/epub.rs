use crate::{
	data::{AuthContext, CoreContext},
	input::epub::{BookmarkInput, EpubProgressInput},
	object::{
		bookmark::Bookmark,
		reading_session::{ActiveReadingSession, FinishedReadingSession},
	},
};
use async_graphql::{Context, Object, Result, SimpleObject, ID};
use models::entity::{
	bookmark, finished_reading_session, reading_session, user::AuthUser,
};
use sea_orm::{prelude::*, sea_query::OnConflict, DatabaseTransaction, TransactionTrait};

#[derive(Default)]
pub struct EpubMutation;

#[derive(Debug, SimpleObject)]
pub struct ReadingProgressOutput {
	active_session: Option<ActiveReadingSession>,
	finished_session: Option<FinishedReadingSession>,
}

impl ReadingProgressOutput {
	pub fn new(
		active_session: Option<ActiveReadingSession>,
		finished_session: Option<FinishedReadingSession>,
	) -> Self {
		Self {
			active_session,
			finished_session,
		}
	}
}

async fn update_epub_progress_finished(
	conn: &DatabaseConnection,
	id: String,
	user: &AuthUser,
	input: EpubProgressInput,
) -> Result<ReadingProgressOutput> {
	let active_session = reading_session::Entity::find_for_user_and_media_id(user, &id)
		.one(conn)
		.await?;

	let started_at = active_session
		.as_ref()
		.map(|s| s.started_at)
		.unwrap_or_default();

	let finished_reading_session =
		input.into_finished_session_active_model(id.clone(), user, started_at);

	let txn = conn.begin().await?;
	let finished_reading_session =
		insert_finished_reading_session(active_session, finished_reading_session, &txn)
			.await?;
	txn.commit().await?;

	Ok(ReadingProgressOutput {
		active_session: None,
		finished_session: Some(finished_reading_session.into()),
	})
}

pub async fn insert_finished_reading_session(
	active_session: Option<reading_session::Model>,
	finished_reading_session: finished_reading_session::ActiveModel,
	txn: &DatabaseTransaction,
) -> Result<finished_reading_session::Model> {
	// Note that finished reading session is used as a read history, so we don't
	// clean up existing ones. The active reading session is deleted, though.
	let finished_reading_session = finished_reading_session.insert(txn).await?;

	if let Some(active_session) = active_session.clone() {
		let _ = active_session.delete(txn).await?;
	}

	Ok(finished_reading_session)
}

async fn update_epub_progress_active(
	conn: &DatabaseConnection,
	user: &AuthUser,
	id: String,
	input: EpubProgressInput,
) -> Result<ReadingProgressOutput> {
	let active_session = input.into_reading_session_active_model(id, user);

	let upserted_session = reading_session::Entity::insert(active_session)
		.on_conflict(
			OnConflict::columns(vec![
				reading_session::Column::MediaId,
				reading_session::Column::UserId,
			])
			.update_columns(vec![
				reading_session::Column::Epubcfi,
				reading_session::Column::PercentageCompleted,
				reading_session::Column::UpdatedAt,
			])
			.to_owned(),
		)
		.exec_with_returning(conn)
		.await?;

	Ok(ReadingProgressOutput {
		active_session: Some(upserted_session.into()),
		finished_session: None,
	})
}

#[Object]
impl EpubMutation {
	/// Update the progress of an epub for a user. If the percentage is 1 or greater, the epub is
	/// considered finished and the active session is deleted and a finished session is created.
	///
	/// If the epub is already finished and the percentage is 1 or greater, the old finished
	/// session is deleted and a new one is created.
	async fn update_epub_progress(
		&self,
		ctx: &Context<'_>,
		id: ID,
		input: EpubProgressInput,
	) -> Result<ReadingProgressOutput> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;

		let is_complete = input
			.is_complete
			.unwrap_or(input.percentage >= Decimal::new(1, 0));
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		if is_complete {
			update_epub_progress_finished(conn, id.to_string(), user, input).await
		} else {
			update_epub_progress_active(conn, user, id.to_string(), input).await
		}
	}

	/// Create or update a bookmark for a user. If a bookmark already exists for the given media
	/// and epubcfi, the preview content is updated.
	async fn create_or_update_bookmark(
		&self,
		ctx: &Context<'_>,
		input: BookmarkInput,
	) -> Result<Bookmark> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let bookmark = input.into_active_model(user);
		let upserted_bookmark = bookmark::Entity::insert(bookmark)
			.on_conflict(
				OnConflict::columns(vec![
					bookmark::Column::UserId,
					bookmark::Column::MediaId,
					bookmark::Column::Epubcfi,
					bookmark::Column::Page,
				])
				.update_column(bookmark::Column::PreviewContent)
				.to_owned(),
			)
			.exec_with_returning(conn)
			.await?;

		Ok(Bookmark {
			model: upserted_bookmark,
		})
	}

	/// Delete a bookmark by epubcfi. The user must be the owner of the bookmark.
	async fn delete_bookmark(
		&self,
		ctx: &Context<'_>,
		epubcfi: String,
	) -> Result<Bookmark> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let bookmark = bookmark::Entity::find_for_user(user)
			.filter(bookmark::Column::Epubcfi.eq(epubcfi))
			.one(conn)
			.await?
			.ok_or("Bookmark not found")?;

		let _ = bookmark.clone().delete(conn).await?;
		Ok(Bookmark { model: bookmark })
	}
}
