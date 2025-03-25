use async_graphql::{Context, Object, Result, ID};
use models::entity::{bookmark, media};
use sea_orm::{prelude::*, QuerySelect};

use crate::{
	data::{CoreContext, RequestContext},
	object::{bookmark::Bookmark, epub::Epub},
};

#[derive(Default)]
pub struct EpubQuery;

#[Object]
impl EpubQuery {
	/// Get a single epub by its media ID
	async fn epub_by_id(&self, ctx: &Context<'_>, id: ID) -> Result<Epub> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let model = media::Entity::find_for_user(user)
			.select_only()
			.columns(vec![media::Column::Id, media::Column::Path])
			.filter(media::Column::Id.eq(id.to_string()))
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
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let user_id = ctx.data::<RequestContext>()?.id();

		Ok(bookmark::Entity::find_for_user(&user_id, id.as_ref())
			.into_model::<bookmark::Model>()
			.all(conn)
			.await?
			.into_iter()
			.map(Bookmark::from)
			.collect())
	}
}
