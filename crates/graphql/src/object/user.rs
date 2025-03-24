use async_graphql::{ComplexObject, Context, Result, SimpleObject};

use models::entity::user;

use crate::{
	guard::{SelfGuard, ServerOwnerGuard},
	pagination::{PaginatedResponse, Pagination, PaginationValidator},
	query::media::MediaQuery,
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
	async fn continue_reading(
		&self,
		ctx: &Context<'_>,
		#[graphql(default, validator(custom = "PaginationValidator"))]
		pagination: Pagination,
	) -> Result<PaginatedResponse<Media>> {
		MediaQuery.keep_reading(ctx, pagination).await
	}
}
