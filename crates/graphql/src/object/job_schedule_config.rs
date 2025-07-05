use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use models::entity::{job_schedule_config, library, library_to_schedule_config};
use sea_orm::{prelude::*, sea_query::Query};

use crate::{
	data::{CoreContext, RequestContext},
	object::library::Library,
};

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct JobScheduleConfig {
	#[graphql(flatten)]
	pub model: job_schedule_config::Model,
}

impl From<job_schedule_config::Model> for JobScheduleConfig {
	fn from(entity: job_schedule_config::Model) -> Self {
		Self { model: entity }
	}
}

#[ComplexObject]
impl JobScheduleConfig {
	async fn excluded_libraries(&self, ctx: &Context<'_>) -> Result<Vec<Library>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let models = library::Entity::find_for_user(user)
			.filter(
				library::Column::Id.in_subquery(
					Query::select()
						.column(library_to_schedule_config::Column::LibraryId)
						.from(library_to_schedule_config::Entity)
						.and_where(
							library_to_schedule_config::Column::ScheduleId
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
