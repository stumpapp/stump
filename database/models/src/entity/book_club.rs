use async_graphql::SimpleObject;
use sea_orm::{entity::prelude::*, sea_query::Query, Condition};

use crate::entity::book_club_member;

use super::user::AuthUser;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "BookClubModel")]
#[sea_orm(table_name = "book_clubs")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text", unique)]
	pub name: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub description: Option<String>,
	pub is_private: bool,
	// TODO(sea-orm): Json
	#[sea_orm(column_type = "Blob", nullable)]
	pub member_role_spec: Option<Vec<u8>>,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub created_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "Text", nullable)]
	pub emoji: Option<String>,
}

pub fn book_clubs_accessible_to_user(user: &AuthUser) -> Option<Condition> {
	// Server owner can see all book clubs
	if user.is_server_owner {
		return None;
	}

	// Any other user can see a book club if they are a member OR if it is not private
	Some(
		Condition::any().add(Column::IsPrivate.eq(false)).add(
			Column::Id.in_subquery(
				Query::select()
					.column(book_club_member::Column::BookClubId)
					.from(book_club_member::Entity)
					.and_where(book_club_member::Column::UserId.eq(user.id.clone()))
					.to_owned(),
			),
		),
	)
}

impl Entity {
	pub fn find_for_user(user: &AuthUser) -> Select<Entity> {
		unimplemented!()
	}
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(has_many = "super::book_club_invitation::Entity")]
	BookClubInvitation,
	#[sea_orm(has_many = "super::book_club_member::Entity")]
	BookClubMember,
	#[sea_orm(has_one = "super::book_club_schedule::Entity")]
	BookClubSchedule,
}

impl Related<super::book_club_invitation::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubInvitation.def()
	}
}

impl Related<super::book_club_member::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubMember.def()
	}
}

impl Related<super::book_club_schedule::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubSchedule.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}
