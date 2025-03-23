use async_graphql::{ComplexObject, Context, Result, SimpleObject};

use models::entity::{media, reading_session, user};
use sea_orm::{prelude::*, QueryOrder};

use crate::{
	data::CoreContext,
	guard::{SelfGuard, ServerOwnerGuard},
};

use super::media::Media;

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct User {
	#[graphql(flatten)]
	pub model: user::Model,
}

impl From<user::Model> for User {
	fn from(entity: user::Model) -> Self {
		Self { model: entity }
	}
}

#[ComplexObject]
impl User {
	#[graphql(guard = "SelfGuard::new(&self.model.id).or(ServerOwnerGuard)")]
	async fn continue_reading(&self, ctx: &Context<'_>) -> Result<Vec<Media>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let in_progress_models = media::ModelWithMetadata::find()
			.inner_join(reading_session::Entity)
			.filter(reading_session::Column::UserId.eq(&self.model.id))
			.order_by_desc(reading_session::Column::UpdatedAt)
			.into_model::<media::ModelWithMetadata>()
			.all(conn)
			.await?;

		Ok(in_progress_models.into_iter().map(Media::from).collect())
	}
}
