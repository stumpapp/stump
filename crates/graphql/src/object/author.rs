use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use models::entity::{media, media_metadata};
use sea_orm::prelude::*;

use crate::{
	data::{AuthContext, CoreContext},
	object::media::Media,
};

// TODO(segmented-library-types): Think through this more and actually implement

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct Author {
	name: String,
}

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct AuthorSeries {
	title: String,
	// Other fields?
}

#[ComplexObject]
impl AuthorSeries {
	async fn books(&self, ctx: &Context<'_>) -> Result<Vec<Media>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;

		let core = ctx.data::<CoreContext>()?;

		let models = media::ModelWithMetadata::find_for_user(user)
			.filter(media_metadata::Column::Series.contains(self.title.clone()))
			.into_model::<media::ModelWithMetadata>()
			.all(core.conn.as_ref())
			.await?;

		Ok(models.into_iter().map(Media::from).collect())
	}
}

#[ComplexObject]
impl Author {
	async fn books(&self, ctx: &Context<'_>) -> Result<Vec<Media>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;

		let core = ctx.data::<CoreContext>()?;

		let models = media::ModelWithMetadata::find_for_user(user)
			.filter(media_metadata::Column::Writers.contains(&self.name))
			.into_model::<media::ModelWithMetadata>()
			.all(core.conn.as_ref())
			.await?;

		Ok(models.into_iter().map(Media::from).collect())
	}

	async fn series(&self, ctx: &Context<'_>) -> Result<Vec<AuthorSeries>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;

		let core = ctx.data::<CoreContext>()?;

		let _models = media::ModelWithMetadata::find_for_user(user)
			.filter(media_metadata::Column::Writers.contains(&self.name))
			.all(core.conn.as_ref())
			.await?;

		unimplemented!()
	}
}
