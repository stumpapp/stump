use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use models::entity::{media, media_metadata};
use sea_orm::prelude::*;

use crate::{data::AuthContext, object::media::Media};

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

		let models = media::ModelWithMetadata::find_for_user(user)
			.filter(media_metadata::Column::Series.contains(self.title.clone()));

		// Fetch the books associated with the series
		unimplemented!()
	}
}

#[ComplexObject]
impl Author {
	async fn books(&self, ctx: &Context<'_>) -> Result<Vec<Media>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;

		let models = media::ModelWithMetadata::find_for_user(user)
			.filter(media_metadata::Column::Writers.contains(&self.name));

		// Fetch the books associated with the author
		unimplemented!()
	}

	async fn series(&self) -> Vec<AuthorSeries> {
		// Fetch the series associated with the author
		unimplemented!()
	}
}
