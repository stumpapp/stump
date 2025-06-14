use crate::{
	data::CoreContext, input::smart_lists::SmartListFilterInput,
	object::smart_list_view::SmartListView,
};
use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use models::entity::{smart_list, smart_list_view};

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct SmartList {
	#[graphql(flatten)]
	pub model: smart_list::Model,
}

impl From<smart_list::Model> for SmartList {
	fn from(entity: smart_list::Model) -> Self {
		Self { model: entity }
	}
}

#[ComplexObject]
impl SmartList {
	async fn filters(&self) -> Result<String> {
		let filters: Vec<SmartListFilterInput> =
			serde_json::from_slice(&self.model.filters)?;
		Ok(serde_json::to_string(&filters)?)
	}

	async fn views(&self, ctx: &Context<'_>) -> Result<Vec<SmartListView>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let views = smart_list_view::Entity::find_by_list_id(&self.model.id)
			.all(conn)
			.await?;
		Ok(views.into_iter().map(SmartListView::from).collect())
	}
}
