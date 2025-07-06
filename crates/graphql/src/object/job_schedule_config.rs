use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use models::entity::{library, library_to_scheduled_job_config, scheduled_job_configs};
use sea_orm::{prelude::*, sea_query::Query};

use crate::{
	data::{CoreContext, RequestContext},
	object::library::Library,
};

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct ScheduledJobConfig {
	#[graphql(flatten)]
	pub model: scheduled_job_configs::Model,
}

impl From<scheduled_job_configs::Model> for ScheduledJobConfig {
	fn from(entity: scheduled_job_configs::Model) -> Self {
		Self { model: entity }
	}
}

#[ComplexObject]
impl ScheduledJobConfig {
	// TODO(scheduler): This will need to be a complex object in the future to allow for
	// different configs for different job types
	async fn scan_configs(&self, ctx: &Context<'_>) -> Result<Vec<Library>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let models = library::Entity::find_for_user(user)
			.filter(
				library::Column::Id.in_subquery(
					Query::select()
						.column(library_to_scheduled_job_config::Column::LibraryId)
						.from(library_to_scheduled_job_config::Entity)
						.and_where(
							library_to_scheduled_job_config::Column::ScheduleId
								.eq(self.model.id.clone()),
						)
						.to_owned(),
				),
			)
			.all(conn)
			.await?;

		Ok(models.into_iter().map(Library::from).collect())
	}
}
