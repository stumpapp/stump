use crate::{
	data::{CoreContext, ServiceContext},
	input::smart_lists::SmartListFilterGroupInput,
	object::smart_list_view::SmartListView,
};
use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use models::{
	entity::{smart_list, smart_list_view},
	shared::image::ImageRef,
};

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
		let filters: Vec<SmartListFilterGroupInput> =
			serde_json::from_slice(&self.model.filters)?;
		Ok(serde_json::to_string(&filters)?)
	}

	// TODO(thumb-placeholders): We need to refactor how non-book thumbs are handled so we can pull
	// dimensions/metadata here.
	async fn thumbnail(&self, ctx: &Context<'_>) -> Result<ImageRef> {
		let service = ctx.data::<ServiceContext>()?;
		Ok(ImageRef {
			// FIXME(graphql): Make thumbnails endpoint
			url: service
				.format_url(format!("/api/v2/smart-lists/{}/thumbnail", self.model.id)),
			..Default::default()
		})
	}

	async fn views(&self, ctx: &Context<'_>) -> Result<Vec<SmartListView>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let views = smart_list_view::Entity::find_by_list_id(&self.model.id)
			.all(conn)
			.await?;
		views
			.into_iter()
			.map(SmartListView::try_from)
			.collect::<Result<Vec<_>, _>>()
	}
}
