use async_graphql::{Context, Object, Result, ID};
use chrono::Utc;
use models::{
	entity::{book_club_book, book_club_discussion},
	shared::book_club::{BookClubExternalBook, BookClubInternalBook},
};
use sea_orm::{prelude::*, Set, TransactionTrait};

use crate::{
	data::{AuthContext, CoreContext},
	input::book_club::AddBookToClubInput,
	mutation::book_club::get_book_club_for_admin,
	object::{book_club::BookClub, book_club_book::BookClubBookVariant},
};

#[derive(Default)]
pub struct BookClubBookMutation;

#[Object]
impl BookClubBookMutation {
	/// Add a book to the club's queue
	async fn add_book_to_club(
		&self,
		ctx: &Context<'_>,
		book_club_id: ID,
		input: AddBookToClubInput,
	) -> Result<BookClub> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let book_club = get_book_club_for_admin(user, &book_club_id, conn)
			.await?
			.ok_or("Book club not found or you lack permission to add books")?;

		let txn = conn.begin().await?;

		let next_position = book_club_book::Entity::get_max_position_for_club(
			book_club_id.as_ref(),
			&txn,
		)
		.await?;

		let book_id = Uuid::new_v4().to_string();

		let active_model = match input.book {
			BookClubBookVariant::Stored(BookClubInternalBook { id }) => {
				book_club_book::ActiveModel {
					id: Set(book_id.clone()),
					position: Set(next_position),
					book_entity_id: Set(Some(id)),
					book_club_id: Set(book_club_id.to_string()),
					..Default::default()
				}
			},
			BookClubBookVariant::External(BookClubExternalBook {
				title,
				author,
				url,
				image_url,
			}) => book_club_book::ActiveModel {
				id: Set(book_id.clone()),
				position: Set(next_position),
				title: Set(Some(title)),
				author: Set(Some(author)),
				url: Set(url),
				image_url: Set(image_url),
				book_club_id: Set(book_club_id.to_string()),
				..Default::default()
			},
		};

		active_model.insert(&txn).await?;

		create_discussions_for_books(&[book_id], book_club_id.as_ref(), &txn).await?;

		txn.commit().await?;

		Ok(book_club.into())
	}

	/// Mark the current book as completed
	async fn complete_book(
		&self,
		ctx: &Context<'_>,
		book_club_book_id: ID,
	) -> Result<BookClub> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let book = book_club_book::Entity::find_by_id(book_club_book_id.as_ref())
			.one(conn)
			.await?
			.ok_or("Book not found")?;

		let book_club =
			get_book_club_for_admin(user, &ID::from(&book.book_club_id), conn)
				.await?
				.ok_or("Book club not found or you lack permission")?;

		let txn = conn.begin().await?;

		let mut active_model: book_club_book::ActiveModel = book.into();
		active_model.completed_at = Set(Some(DateTimeWithTimeZone::from(Utc::now())));
		active_model.update(&txn).await?;

		book_club_discussion::Entity::update_many()
			.col_expr(book_club_discussion::Column::IsArchived, Expr::value(true))
			.filter(
				book_club_discussion::Column::BookClubBookId
					.eq(book_club_book_id.as_ref()),
			)
			.exec(&txn)
			.await?;

		txn.commit().await?;

		Ok(book_club.into())
	}

	/// Reorder uncompleted books in the club's queue. Completed books cannot be reordered since they are effectively archived
	async fn reorder_books(
		&self,
		ctx: &Context<'_>,
		book_club_id: ID,
		#[graphql(validator(min_items = 1))] book_ids: Vec<String>,
	) -> Result<BookClub> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let book_club = get_book_club_for_admin(user, &book_club_id, conn)
			.await?
			.ok_or("Book club not found or you lack permission")?;

		let txn = conn.begin().await?;

		let completed_count = book_club_book::Entity::find()
			.filter(book_club_book::Column::Id.is_in(&book_ids))
			.filter(book_club_book::Column::CompletedAt.is_not_null())
			.count(&txn)
			.await?;

		if completed_count > 0 {
			return Err("Cannot reorder completed books".into());
		}

		let offset = book_club_book::Entity::get_next_position_after_completed(
			book_club_id.as_ref(),
			&txn,
		)
		.await?;

		for (i, book_id) in book_ids.iter().enumerate() {
			book_club_book::Entity::update_many()
				.col_expr(
					book_club_book::Column::Position,
					Expr::value(offset + i as i32),
				)
				.filter(book_club_book::Column::Id.eq(book_id))
				.filter(book_club_book::Column::BookClubId.eq(book_club_id.as_ref()))
				.exec(&txn)
				.await?;
		}

		txn.commit().await?;

		Ok(book_club.into())
	}
}

/// Creates a discussion for each book in the list
pub async fn create_discussions_for_books<C>(
	book_ids: &[String],
	book_club_id: &str,
	conn: &C,
) -> Result<()>
where
	C: ConnectionTrait,
{
	if book_ids.is_empty() {
		return Ok(());
	}

	let discussion_models: Vec<_> = book_ids
		.iter()
		.map(|book_id| book_club_discussion::ActiveModel {
			id: Set(Uuid::new_v4().to_string()),
			is_locked: Set(false),
			is_archived: Set(false),
			book_club_book_id: Set(Some(book_id.clone())),
			title: Set(None),
			is_pinned: Set(false),
			created_at: Set(DateTimeWithTimeZone::from(Utc::now())),
			book_club_id: Set(book_club_id.to_string()),
			..Default::default()
		})
		.collect();

	book_club_discussion::Entity::insert_many(discussion_models)
		.exec(conn)
		.await?;

	Ok(())
}
