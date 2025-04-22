use async_graphql::SimpleObject;

#[derive(Debug, Clone, SimpleObject)]
pub struct ImageRef {
	pub url: String,
	pub height: Option<u32>,
	pub width: Option<u32>,
}
