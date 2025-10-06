use async_graphql::{Context, Object, Result, ID};
use chrono::{DateTime, Duration, FixedOffset, Utc};
use models::{
	entity::{book_club_book, book_club_schedule},
	shared::book_club::{BookClubBook, BookClubExternalBook, BookClubInternalBook},
};
use sea_orm::{prelude::*, Set, TransactionTrait};

use crate::{
	data::{AuthContext, CoreContext},
	input::book_club::{CreateBookClubScheduleBook, CreateBookClubScheduleInput},
	mutation::book_club::get_book_club_for_admin,
	object::book_club::BookClub,
};

#[derive(Default)]
pub struct BookClubScheduleMutation;

#[Object]
impl BookClubScheduleMutation {
	async fn create_book_club_schedule(
		&self,
		ctx: &Context<'_>,
		id: ID,
		input: CreateBookClubScheduleInput,
	) -> Result<BookClub> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let book_club = get_book_club_for_admin(user, &id, conn)
			.await?
			.ok_or("Book club not found or you lack permission to create schedule")?;

		let interval_days = input.default_interval_days.unwrap_or(30);
		let books_to_create = input.books;

		create_book_club_books(&id, interval_days, books_to_create, conn).await?;

		Ok(book_club.into())
	}

	async fn add_books_to_book_club_schedule(
		&self,
		ctx: &Context<'_>,
		id: ID,
		#[graphql(validator(min_items = 1))] books: Vec<CreateBookClubScheduleBook>,
	) -> Result<BookClub> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let book_club = get_book_club_for_admin(user, &id, conn)
			.await?
			.ok_or("Book club not found or you lack permission to adjust the schedule")?;

		let schedule = book_club_schedule::Entity::find_for_book_club_id(id.as_ref())
			.one(conn)
			.await?
			.ok_or("Schedule not found")?;
		let existing_books = book_club_book::Entity::find_with_schedule_for_book_club_id(
			id.as_ref(),
			Utc::now(),
		)
		.all(conn)
		.await?;

		let mut last_end_at = existing_books.last().map(|book| book.end_at);

		let active_models = books
			.into_iter()
			.map(|book| create_book_active_model(&schedule, &mut last_end_at, book))
			.collect::<Vec<_>>();

		book_club_book::Entity::insert_many(active_models)
			.exec(conn)
			.await?;

		Ok(book_club.into())
	}
}

async fn create_book_club_books(
	id: &ID,
	interval_days: i32,
	books_to_create: Vec<CreateBookClubScheduleBook>,
	conn: &DatabaseConnection,
) -> Result<()> {
	let txn = conn.begin().await?;

	let created_schedule = book_club_schedule::ActiveModel {
		book_club_id: Set(id.to_string()),
		default_interval_days: Set(Some(interval_days)),
		..Default::default()
	}
	.insert(&txn)
	.await?;

	let mut last_end_at = None;

	let active_models = books_to_create
		.into_iter()
		.map(|book| create_book_active_model(&created_schedule, &mut last_end_at, book))
		.collect::<Vec<_>>();

	book_club_book::Entity::insert_many(active_models)
		.exec(&txn)
		.await?;

	txn.commit().await?;
	Ok(())
}

fn create_book_active_model(
	schedule: &book_club_schedule::Model,
	last_end_at: &mut Option<DateTime<FixedOffset>>,
	input: CreateBookClubScheduleBook,
) -> book_club_book::ActiveModel {
	let CreateBookClubScheduleBook {
		book,
		start_at,
		end_at,
		discussion_duration_days,
	} = input;

	let interval_days = schedule.default_interval_days.unwrap_or(30);

	let (start_at, end_at) =
		get_next_start_end_at(*last_end_at, interval_days, start_at, end_at);
	*last_end_at = Some(end_at);

	match book {
		BookClubBook::Stored(BookClubInternalBook { id }) => {
			book_club_book::ActiveModel {
				id: Set(Uuid::new_v4().to_string()),
				start_at: Set(start_at),
				end_at: Set(end_at),
				discussion_duration_days: Set(discussion_duration_days),
				book_entity_id: Set(Some(id)),
				book_club_schedule_id: Set(Some(schedule.id)),
				..Default::default()
			}
		},
		BookClubBook::External(BookClubExternalBook {
			title,
			author,
			url,
			image_url,
		}) => book_club_book::ActiveModel {
			id: Set(Uuid::new_v4().to_string()),
			start_at: Set(start_at),
			end_at: Set(end_at),
			discussion_duration_days: Set(discussion_duration_days),
			title: Set(Some(title)),
			author: Set(Some(author)),
			url: Set(url),
			image_url: Set(image_url),
			book_club_schedule_id: Set(Some(schedule.id)),
			..Default::default()
		},
	}
}

fn get_next_start_end_at(
	last_end_at: Option<DateTime<FixedOffset>>,
	interval_days: i32,
	start_at: Option<DateTime<FixedOffset>>,
	end_at: Option<DateTime<FixedOffset>>,
) -> (DateTime<FixedOffset>, DateTime<FixedOffset>) {
	match (start_at, end_at) {
		(Some(start_at), Some(end_at)) => (start_at, end_at),
		(Some(start_at), None) => (
			start_at,
			start_at + Duration::days(i64::from(interval_days)),
		),
		(None, Some(end_at)) => {
			(end_at - Duration::days(i64::from(interval_days)), end_at)
		},
		(None, None) => {
			let start_at = if let Some(last_end_at) = last_end_at {
				last_end_at
			} else {
				Utc::now().into()
			};
			(
				start_at,
				start_at + Duration::days(i64::from(interval_days)),
			)
		},
	}
}

#[cfg(test)]
mod tests {
	use crate::tests::common::*;

	use super::*;
	use chrono::{DateTime, FixedOffset};
	use pretty_assertions::assert_eq;
	use sea_orm::ActiveValue::NotSet;

	#[test]
	fn test_create_book_active_model_stored() {
		let schedule = book_club_schedule::Model {
			id: 314,
			book_club_id: "123".to_string(),
			default_interval_days: Some(30),
		};
		let mut last_end_at = None;
		let input = CreateBookClubScheduleBook {
			book: BookClubBook::Stored(BookClubInternalBook {
				id: "456".to_string(),
			}),
			start_at: None,
			end_at: None,
			discussion_duration_days: None,
		};

		let active_model = create_book_active_model(&schedule, &mut last_end_at, input);

		assert_eq!(
			active_model.book_entity_id.unwrap().unwrap(),
			"456".to_string()
		);
		assert_eq!(active_model.book_club_schedule_id.unwrap().unwrap(), 314);
		assert!(!active_model.id.unwrap().is_empty());
		assert_eq!(active_model.author, NotSet);
	}

	#[test]
	fn test_create_book_active_model_external() {
		let schedule = book_club_schedule::Model {
			id: 314,
			book_club_id: "123".to_string(),
			default_interval_days: Some(30),
		};
		let mut last_end_at = None;
		let input = CreateBookClubScheduleBook {
			book: BookClubBook::External(BookClubExternalBook {
				title: "Lord of the Rings".to_string(),
				author: "J. R. R. Tolkien".to_string(),
				url: None,
				image_url: None,
			}),
			start_at: None,
			end_at: None,
			discussion_duration_days: None,
		};

		let active_model = create_book_active_model(&schedule, &mut last_end_at, input);

		assert_eq!(active_model.book_entity_id, NotSet);
		assert_eq!(active_model.book_club_schedule_id.unwrap().unwrap(), 314);
		assert!(!active_model.id.unwrap().is_empty());
		assert_eq!(
			active_model.author.unwrap().unwrap(),
			"J. R. R. Tolkien".to_string()
		);
	}

	fn is_close_to_interval(duration: Duration, interval_days: i32) -> bool {
		let end_at = Duration::days(interval_days.into());
		let diff = (duration - end_at).num_seconds();
		diff.abs() < 60
	}

	#[test]
	fn test_get_next_start_end_at_now() {
		let interval_days = 7;
		let (start_at, end_at) = get_next_start_end_at(None, interval_days, None, None);

		let now = Utc::now();
		let duration = end_at.signed_duration_since(now);
		assert!(is_close_to_interval(duration, interval_days));
		assert!(is_close_to_now(start_at.into()));
	}

	#[test]
	fn test_get_next_start_end_at_multiple_calls() {
		let interval_days = 30;
		let original_start_at =
			DateTime::parse_from_rfc3339("2023-03-14T00:00:00Z").unwrap();
		let mut last_end_at = original_start_at;
		let (start_at, end_at) =
			get_next_start_end_at(Some(last_end_at), interval_days, None, None);

		assert_eq!(start_at, original_start_at);
		assert_eq!(
			end_at,
			DateTime::parse_from_rfc3339("2023-04-13T00:00:00Z").unwrap()
		);

		// check next
		last_end_at = end_at;
		let (start_at, end_at) =
			get_next_start_end_at(Some(last_end_at), interval_days, None, None);

		assert_eq!(
			start_at,
			DateTime::parse_from_rfc3339("2023-04-13T00:00:00Z").unwrap()
		);
		assert_eq!(
			end_at,
			DateTime::parse_from_rfc3339("2023-05-13T00:00:00Z").unwrap()
		);
	}

	#[test]
	fn test_get_next_start_end_at_with_start_and_end() {
		let interval_days = 30;
		let start_at: DateTime<FixedOffset> =
			DateTime::parse_from_rfc3339("2023-03-14T00:00:00Z").unwrap();
		let end_at: DateTime<FixedOffset> =
			DateTime::parse_from_rfc3339("2023-04-14T00:00:00Z").unwrap();
		let (start_at_2, end_at_2) =
			get_next_start_end_at(None, interval_days, Some(start_at), Some(end_at));

		assert_eq!(start_at_2, start_at);
		assert_eq!(end_at_2, end_at);
	}

	#[test]
	fn test_get_next_start_end_at_with_start() {
		let interval_days = 30;
		let start_at: DateTime<FixedOffset> =
			DateTime::parse_from_rfc3339("2023-03-14T00:00:00Z").unwrap();
		let (start_at_2, end_at) =
			get_next_start_end_at(None, interval_days, Some(start_at), None);

		assert_eq!(start_at_2, start_at);
		assert_eq!(
			end_at,
			DateTime::parse_from_rfc3339("2023-04-13T00:00:00Z").unwrap()
		);
	}

	#[test]
	fn test_get_next_start_end_at_with_end() {
		let interval_days = 30;
		let end_at: DateTime<FixedOffset> =
			DateTime::parse_from_rfc3339("2023-04-13T00:00:00Z").unwrap();
		let (start_at, end_at_2) =
			get_next_start_end_at(None, interval_days, None, Some(end_at));

		assert_eq!(
			start_at,
			DateTime::parse_from_rfc3339("2023-03-14T00:00:00Z").unwrap()
		);
		assert_eq!(end_at_2, end_at);
	}
}
