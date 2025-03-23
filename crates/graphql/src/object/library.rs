use async_graphql::{ComplexObject, Context, Result, SimpleObject};

use models::entity::{library, library_config, library_to_tag, series, tag};
use sea_orm::{prelude::*, sea_query::Query};

use crate::data::CoreContext;

use super::{library_config::LibraryConfig, series::Series};

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct Library {
	#[graphql(flatten)]
	pub model: library::Model,
}

impl From<library::Model> for Library {
	fn from(model: library::Model) -> Self {
		Self { model }
	}
}

#[ComplexObject]
impl Library {
	async fn config(&self, ctx: &Context<'_>) -> Result<LibraryConfig> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let config = library_config::Entity::find()
			.filter(library_config::Column::Id.eq(self.model.config_id))
			.one(conn)
			.await?
			.ok_or("Library config not found")?;

		Ok(config.into())
	}

	async fn series(&self, ctx: &Context<'_>) -> Result<Vec<Series>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let models = series::ModelWithMetadata::find()
			.filter(series::Column::LibraryId.eq(Some(self.model.id.clone())))
			.into_model::<series::ModelWithMetadata>()
			.all(conn)
			.await?;

		Ok(models.into_iter().map(Series::from).collect())
	}

	async fn tags(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let tags = tag::Entity::find()
			.filter(
				tag::Column::Id.in_subquery(
					Query::select()
						.column(library_to_tag::Column::TagId)
						.from(library_to_tag::Entity)
						.and_where(
							library_to_tag::Column::LibraryId.eq(self.model.id.clone()),
						)
						.to_owned(),
				),
			)
			.all(conn)
			.await?;

		Ok(tags.into_iter().map(|t| t.name).collect())
	}
}
