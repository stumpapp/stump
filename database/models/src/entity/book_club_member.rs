use super::{book_club, user::AuthUser};
use async_graphql::SimpleObject;
use sea_orm::{
	prelude::*,
	sea_query::{Query, SimpleExpr},
	ColumnTrait, Condition,
};

use crate::shared::book_club::BookClubMemberRole;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "BookClubMemberModel")]
#[sea_orm(table_name = "book_club_members")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub display_name: Option<String>,
	pub is_creator: bool,
	pub hide_progress: bool,
	pub private_membership: bool,
	pub role: BookClubMemberRole,
	#[sea_orm(column_type = "Text")]
	pub user_id: String,
	#[sea_orm(column_type = "Text")]
	pub book_club_id: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(has_many = "super::book_club_book_suggestion_like::Entity")]
	BookClubBookSuggestionLike,
	#[sea_orm(has_many = "super::book_club_book_suggestion::Entity")]
	BookClubBookSuggestion,
	#[sea_orm(has_many = "super::book_club_discussion_message_like::Entity")]
	BookClubDiscussionMessageLike,
	#[sea_orm(has_many = "super::book_club_discussion_message::Entity")]
	BookClubDiscussionMessage,
	#[sea_orm(has_one = "super::book_club_member_favorite_book::Entity")]
	BookClubMemberFavoriteBook,
	#[sea_orm(
		belongs_to = "super::book_club::Entity",
		from = "Column::BookClubId",
		to = "super::book_club::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	BookClub,
	#[sea_orm(
		belongs_to = "super::user::Entity",
		from = "Column::UserId",
		to = "super::user::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	User,
}

impl Related<super::book_club_book_suggestion_like::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubBookSuggestionLike.def()
	}
}

impl Related<super::book_club_book_suggestion::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubBookSuggestion.def()
	}
}

impl Related<super::book_club_discussion_message_like::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubDiscussionMessageLike.def()
	}
}

impl Related<super::book_club_discussion_message::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubDiscussionMessage.def()
	}
}

impl Related<super::book_club_member_favorite_book::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubMemberFavoriteBook.def()
	}
}

impl Related<super::book_club::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClub.def()
	}
}

impl Related<super::user::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::User.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}

impl Entity {
	fn members_accessible_to_user_for_book_club_member(user: &AuthUser) -> SimpleExpr {
		Column::BookClubId.in_subquery(
			Query::select()
				.column(Column::BookClubId)
				.from(Self)
				.and_where(Column::UserId.eq(user.id.clone()))
				.to_owned(),
		)
	}

	fn members_accessible_to_user_for_non_book_club_member() -> Condition {
		Condition::all()
			.add(Column::PrivateMembership.eq(false))
			.add(
				Column::BookClubId.in_subquery(
					Query::select()
						.column(book_club::Column::Id)
						.from(Self)
						.and_where(book_club::Column::IsPrivate.eq(false))
						.to_owned(),
				),
			)
	}

	pub fn find_members_accessible_to_user(user: &AuthUser) -> Select<Self> {
		if user.is_server_owner {
			Self::find()
		} else {
			Self::find().filter(
				Condition::any()
					.add(Self::members_accessible_to_user_for_book_club_member(user))
					.add(Self::members_accessible_to_user_for_non_book_club_member()),
			)
		}
	}
}
