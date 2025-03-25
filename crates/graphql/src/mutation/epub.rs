use crate::{
	data::{CoreContext, RequestContext},
	object::{
		bookmark::Bookmark,
		reading_session::{ActiveReadingSession, FinishedReadingSession},
	},
};
use async_graphql::{Context, InputObject, Object, Result, SimpleObject, ID};
use models::entity::{bookmark, finished_reading_session, reading_session};
use sea_orm::{prelude::*, sea_query::OnConflict, ActiveValue::Set, TransactionTrait};

#[derive(Default)]
pub struct EpubMutation;

#[derive(InputObject)]
struct BookmarkInput {
	media_id: String,
	epubcfi: String,
	preview_content: Option<String>,
}

#[derive(InputObject)]
struct EpubProgressInput {
	media_id: String,
	epubcfi: String,
	percentage: Decimal,
	is_complete: Option<bool>,
}

#[derive(Debug, SimpleObject)]
pub struct EpubProgressOutput {
	active_session: Option<ActiveReadingSession>,
	finished_session: Option<FinishedReadingSession>,
}

async fn update_epub_progress_finished(
	conn: &DatabaseConnection,
	user_id: String,
	input: EpubProgressInput,
) -> Result<EpubProgressOutput> {
	Ok(conn
		.transaction::<_, _, DbErr>(|txn| {
			Box::pin(async move {
				let active_session = reading_session::Entity::find()
					.filter(reading_session::Column::UserId.eq(user_id.clone()))
					.filter(reading_session::Column::MediaId.eq(input.media_id.clone()))
					.one(txn)
					.await?;

				let started_at = active_session
					.as_ref()
					.map(|s| s.started_at)
					.unwrap_or_default();

				let finished_reading_session = finished_reading_session::ActiveModel {
					started_at: Set(started_at),
					media_id: Set(input.media_id.clone()),
					user_id: Set(user_id.clone()),
					completed_at: Set(chrono::Utc::now().into()),
					..Default::default()
				};

				// Note that finished reading session is used as a read history, so we don't
				// clean up existing ones. The active reading session is deleted, though.
				let finished_reading_session =
					finished_reading_session.insert(txn).await?;

				if let Some(active_session) = active_session.clone() {
					let _ = active_session.delete(txn).await?;
				}

				Ok(EpubProgressOutput {
					active_session: None,
					finished_session: Some(finished_reading_session.into()),
				})
			})
		})
		.await?)
}

async fn update_epub_progress_active(
	conn: &DatabaseConnection,
	user_id: String,
	input: EpubProgressInput,
) -> Result<EpubProgressOutput> {
	let active_session = reading_session::ActiveModel {
		// TODO: Consider i32 for ID
		id: Set(Uuid::new_v4().to_string()),
		epubcfi: Set(Some(input.epubcfi.clone())),
		percentage_completed: Set(Some(input.percentage)),
		media_id: Set(input.media_id.clone()),
		user_id: Set(user_id.clone()),
		updated_at: Set(chrono::Utc::now().into()),
		..Default::default()
	};

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

	Ok(EpubProgressOutput {
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
		input: EpubProgressInput,
	) -> Result<EpubProgressOutput> {
		let user_id = ctx.data::<RequestContext>()?.id();

		let is_complete = input
			.is_complete
			.unwrap_or(input.percentage >= Decimal::new(1, 0));
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		if is_complete {
			update_epub_progress_finished(conn, user_id, input).await
		} else {
			update_epub_progress_active(conn, user_id, input).await
		}
	}

	/// Create or update a bookmark for a user. If a bookmark already exists for the given media
	/// and epubcfi, the preview content is updated.
	async fn create_or_update_bookmark(
		&self,
		ctx: &Context<'_>,
		input: BookmarkInput,
	) -> Result<Bookmark> {
		let user_id = ctx.data::<RequestContext>()?.id();

		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let bookmark = bookmark::ActiveModel {
			// TODO(sea-orm): Consider i32 for ID
			id: Set(Uuid::new_v4().to_string()),
			epubcfi: Set(Some(input.epubcfi.clone())),
			preview_content: Set(input.preview_content.clone()),
			media_id: Set(input.media_id.clone()),
			user_id: Set(user_id.clone()),
			page: Set(Some(-1)),
		};

		let upserted_bookmark = bookmark::Entity::insert(bookmark)
			.on_conflict(
				OnConflict::columns(vec![
					bookmark::Column::MediaId,
					bookmark::Column::UserId,
					bookmark::Column::Epubcfi,
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

	/// Delete a bookmark by ID. The user must be the owner of the bookmark.
	async fn delete_bookmark(&self, ctx: &Context<'_>, id: ID) -> Result<Bookmark> {
		let user_id = ctx.data::<RequestContext>()?.id();
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let bookmark = bookmark::Entity::find()
			.filter(bookmark::Column::Id.eq(id.to_string()))
			.filter(bookmark::Column::UserId.eq(user_id))
			.one(conn)
			.await?
			.ok_or("Bookmark not found")?;

		let _ = bookmark.clone().delete(conn).await?;
		Ok(Bookmark { model: bookmark })
	}
}
