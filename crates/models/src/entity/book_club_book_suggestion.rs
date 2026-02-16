use async_graphql::SimpleObject;
use sea_orm::entity::prelude::*;

use crate::shared::book_club::BookClubSuggestionStatus;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, SimpleObject)]
#[graphql(name = "BookClubBookSuggestionModel")]
#[sea_orm(table_name = "book_club_book_suggestions")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text")]
	pub book_club_id: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub title: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub author: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub url: Option<String>,
	#[sea_orm(column_type = "Text", nullable)]
	pub notes: Option<String>,
	pub status: BookClubSuggestionStatus,
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub resolved_at: Option<DateTimeWithTimeZone>,
	#[sea_orm(column_type = "Text", nullable)]
	pub resolved_by_id: Option<String>,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub created_at: DateTimeWithTimeZone,
	#[sea_orm(column_type = "Text")]
	pub suggested_by_id: String,
	#[sea_orm(column_type = "Text", nullable)]
	pub book_id: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(has_many = "super::book_club_book_suggestion_like::Entity")]
	BookClubBookSuggestionLike,
	#[sea_orm(
		belongs_to = "super::book_club::Entity",
		from = "Column::BookClubId",
		to = "super::book_club::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	BookClub,
	#[sea_orm(
		belongs_to = "super::book_club_member::Entity",
		from = "Column::SuggestedById",
		to = "super::book_club_member::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	SuggestedBy,
	#[sea_orm(
		belongs_to = "super::book_club_member::Entity",
		from = "Column::ResolvedById",
		to = "super::book_club_member::Column::Id",
		on_update = "Cascade",
		on_delete = "SetNull"
	)]
	ResolvedBy,
	#[sea_orm(
		belongs_to = "super::media::Entity",
		from = "Column::BookId",
		to = "super::media::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	Media,
}

impl Related<super::book_club_book_suggestion_like::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubBookSuggestionLike.def()
	}
}

impl Related<super::book_club::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClub.def()
	}
}

impl Related<super::media::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Media.def()
	}
}

impl Related<super::book_club_member::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::SuggestedBy.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}
