use async_graphql::{ComplexObject, Result, SimpleObject};
use models::entity::book_club;

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct BookClub {
	#[graphql(flatten)]
	model: book_club::Model,
}

#[ComplexObject]
impl BookClub {
	async fn current_book(&self) -> Result<String> {
		unimplemented!()
	}

	async fn invitations(&self) -> Result<String> {
		unimplemented!()
	}

	async fn members(&self) -> Result<String> {
		unimplemented!()
	}

	async fn schedule(&self) -> Result<String> {
		unimplemented!()
	}
}
