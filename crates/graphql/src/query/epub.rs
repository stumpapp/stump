use async_graphql::{Context, Object, Result, ID};
use models::entity::{bookmark, media};

use crate::{
	data::{AuthContext, CoreContext},
	object::{bookmark::Bookmark, epub::Epub},
};

#[derive(Default)]
pub struct EpubQuery;

#[Object]
impl EpubQuery {
	/// Get a single epub by its media ID
	async fn epub_by_id(&self, ctx: &Context<'_>, id: ID) -> Result<Epub> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let model = media::Entity::find_media_ids_for_user(id.to_string(), user)
			.into_model::<media::MediaIdentSelect>()
			.one(conn)
			.await?
			.ok_or("Media not found")?;

		Epub::try_from(model)
	}

	/// Get all bookmarks for a single epub by its media ID
	async fn bookmarks_by_media_id(
		&self,
		ctx: &Context<'_>,
		id: ID,
	) -> Result<Vec<Bookmark>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		Ok(
			bookmark::Entity::find_for_user_and_media_id(user, id.as_ref())
				.into_model::<bookmark::Model>()
				.all(conn)
				.await?
				.into_iter()
				.map(Bookmark::from)
				.collect(),
		)
	}
}
