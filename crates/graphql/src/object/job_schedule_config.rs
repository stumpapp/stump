use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use models::entity::{library, scheduled_job_config, scheduled_job_library};
use sea_orm::{prelude::*, sea_query::Query};

use crate::{
	data::{AuthContext, CoreContext},
	object::library::Library,
};

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct ScheduledJobConfig {
	#[graphql(flatten)]
	pub model: scheduled_job_config::Model,
}

impl From<scheduled_job_config::Model> for ScheduledJobConfig {
	fn from(entity: scheduled_job_config::Model) -> Self {
		Self { model: entity }
	}
}

#[ComplexObject]
impl ScheduledJobConfig {
	// TODO(scheduler): This will need to be a complex object in the future to allow for
	// different configs for different job types
	async fn scan_configs(&self, ctx: &Context<'_>) -> Result<Vec<Library>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let models = library::Entity::find_for_user(user)
			.filter(
				library::Column::Id.in_subquery(
					Query::select()
						.column(scheduled_job_library::Column::LibraryId)
						.from(scheduled_job_library::Entity)
						.and_where(
							scheduled_job_library::Column::ScheduleId.eq(self.model.id),
						)
						.to_owned(),
				),
			)
			.all(conn)
			.await?;

		Ok(models.into_iter().map(Library::from).collect())
	}
}
