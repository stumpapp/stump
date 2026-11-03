use async_graphql::SimpleObject;
use sea_orm::entity::prelude::*;

use super::{book_club, book_club_book_suggestion_like, book_club_member, media};

use crate::shared::book_club::BookClubSuggestionStatus;

#[sea_orm::model]
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
	#[sea_orm(has_many)]
	#[graphql(skip)]
	pub likes: HasMany<book_club_book_suggestion_like::Entity>,
	#[sea_orm(
		belongs_to,
		from = "book_club_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	#[graphql(skip)]
	pub book_club: BelongsTo<book_club::Entity>,
	#[sea_orm(
		belongs_to,
		relation_enum = "SuggestedBy",
		from = "suggested_by_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	#[graphql(skip)]
	pub suggested_by: BelongsTo<book_club_member::Entity>,
	#[sea_orm(
		belongs_to,
		relation_enum = "ResolvedBy",
		from = "resolved_by_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "SetNull"
	)]
	#[graphql(skip)]
	pub resolved_by: BelongsTo<Option<book_club_member::Entity>>,
	#[sea_orm(
		belongs_to,
		from = "book_id",
		to = "id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	#[graphql(skip)]
	pub book: BelongsTo<Option<media::Entity>>,
}

impl ActiveModelBehavior for ActiveModel {}

// NOTE: this apparently had to be manually-added bc the new entity format
// will only generate related impls when only one relation targets an entity.
// since we have two (suggested_by, resolved_by) pointing at member, it
// won't do it for us
impl Related<book_club_member::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::SuggestedBy.def()
	}
}
