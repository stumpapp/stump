use crate::{
	data::{AuthContext, CoreContext},
	input::media::{BookmarkInput, CreateAnnotationInput, UpdateAnnotationInput},
	object::{bookmark::Bookmark, media_annotation::MediaAnnotation},
};
use async_graphql::{Context, Object, Result};
use models::entity::{bookmark, media_annotation};
use sea_orm::{prelude::*, Set};

#[derive(Default)]
pub struct EpubMutation;

// TODO: Would it make sense to fold these into the media mutation? Do people want
// bookmarks/annotations/etc for non-epub content?

#[Object]
impl EpubMutation {
	/// Create a bookmark for a user
	async fn create_bookmark(
		&self,
		ctx: &Context<'_>,
		input: BookmarkInput,
	) -> Result<Bookmark> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let bookmark = input.into_active_model(user);
		let created_bookmark = bookmark::Entity::insert(bookmark)
			.exec_with_returning(conn)
			.await?;

		Ok(Bookmark {
			model: created_bookmark,
		})
	}

	/// Delete a bookmark by ID, only if the user created it
	async fn delete_bookmark(&self, ctx: &Context<'_>, id: String) -> Result<Bookmark> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let bookmark = bookmark::Entity::find_for_user(user)
			.filter(bookmark::Column::Id.eq(id))
			.one(conn)
			.await?
			.ok_or("Bookmark not found")?;

		let _ = bookmark.clone().delete(conn).await?;
		Ok(Bookmark { model: bookmark })
	}

	// TODO: This will be removed once the web client migrates to Readium
	/// Delete a bookmark by epubcfi
	async fn delete_bookmark_by_epubcfi(
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

	/// Create an annotation (highlight/note)
	async fn create_annotation(
		&self,
		ctx: &Context<'_>,
		input: CreateAnnotationInput,
	) -> Result<MediaAnnotation> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let annotation = input.into_active_model(user);
		let created_annotation = annotation.insert(conn).await?;

		Ok(MediaAnnotation::from(created_annotation))
	}

	/// Update an annotation's note text
	async fn update_annotation(
		&self,
		ctx: &Context<'_>,
		input: UpdateAnnotationInput,
	) -> Result<MediaAnnotation> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let annotation = media_annotation::Entity::find()
			.filter(media_annotation::Column::Id.eq(&input.id))
			.filter(media_annotation::Column::UserId.eq(&user.id))
			.one(conn)
			.await?
			.ok_or("Annotation not found")?;

		let mut active_model: media_annotation::ActiveModel = annotation.into();
		active_model.annotation_text = Set(input.annotation_text);

		let updated = active_model.update(conn).await?;
		Ok(MediaAnnotation::from(updated))
	}

	/// Delete an annotation by ID
	async fn delete_annotation(
		&self,
		ctx: &Context<'_>,
		id: String,
	) -> Result<MediaAnnotation> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let annotation = media_annotation::Entity::find()
			.filter(media_annotation::Column::Id.eq(&id))
			.filter(media_annotation::Column::UserId.eq(&user.id))
			.one(conn)
			.await?
			.ok_or("Annotation not found")?;

		let _ = annotation.clone().delete(conn).await?;
		Ok(MediaAnnotation::from(annotation))
	}
}
