use crate::{
	data::{AuthContext, CoreContext},
	input::media::BookmarkInput,
	object::bookmark::Bookmark,
};
use async_graphql::{Context, Object, Result};
use models::entity::bookmark;
use sea_orm::{prelude::*, sea_query::OnConflict};

#[derive(Default)]
pub struct EpubMutation;

// TODO: Would it make sense to fold these into the media mutation? Do people want
// bookmarks/annotations/etc for non-epub content?

#[Object]
impl EpubMutation {
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
