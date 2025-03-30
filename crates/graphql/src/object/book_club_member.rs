use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use models::{
	entity::{book_club, book_club_member, user},
	shared::enums::UserPermission,
};
use sea_orm::EntityTrait;

use crate::{
	data::CoreContext,
	guard::{PermissionGuard, SelfGuard},
};

use super::{book_club::BookClub, user::User};

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
