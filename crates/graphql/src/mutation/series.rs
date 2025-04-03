use async_graphql::{Context, Object, Result, ID};
use models::{entity::series, shared::enums::UserPermission};
use sea_orm::{prelude::*, QuerySelect};
use stump_core::filesystem::{
	media::analyze_media_job::AnalyzeMediaJob, scanner::SeriesScanJob,
};

use crate::{
	data::{CoreContext, RequestContext},
	guard::PermissionGuard,
	object::series::Series,
};

#[derive(Default)]
pub struct SeriesMutation;

#[Object]
impl SeriesMutation {
	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageLibrary)")]
	async fn analyze_series(&self, ctx: &Context<'_>, id: ID) -> Result<bool> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let model =
			series::Entity::find_series_ident_for_user_and_id(user, id.to_string())
				.into_model::<series::SeriesIdentSelect>()
				.one(conn)
				.await?
				.ok_or("Series not found")?;

		core.enqueue_job(AnalyzeMediaJob::analyze_series(model.id))?;

		Ok(true)
	}

	// TODO(graphql): (thumbnail API remains RESTful). This serves as a reminder, it won't live here

	// TODO(graphql): Implement mark_series_as_complete
	async fn mark_series_as_complete(&self, ctx: &Context<'_>, id: ID) -> Result<Series> {
		unimplemented!()
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::ScanLibrary)")]
	async fn scan_series(&self, ctx: &Context<'_>, id: ID) -> Result<bool> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let model =
			series::Entity::find_series_ident_for_user_and_id(user, id.to_string())
				.into_model::<series::SeriesIdentSelect>()
				.one(conn)
				.await?
				.ok_or("Series not found")?;

		core.enqueue_job(SeriesScanJob::new(model.id, model.path, None))?;

		Ok(true)
	}
}
