use async_graphql::SimpleObject;
use models::entity::book_club_member;

#[derive(Debug, SimpleObject)]
// #[graphql(complex)]
pub struct BookClubMember {
	#[graphql(flatten)]
	model: book_club_member::Model,
}

impl From<book_club_member::Model> for BookClubMember {
	fn from(model: book_club_member::Model) -> Self {
		Self { model }
	}
}
// #[ComplexObject]
// impl BookClubMember {}
