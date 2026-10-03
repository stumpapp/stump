use crate::{
	entity::{author, media, media_author, series_author},
	shared::enums::AuthorRole,
};
use chrono::Utc;
use sea_orm::{
	prelude::*,
	sea_query::{OnConflict, Query},
	ActiveValue::Set,
	DbErr, QuerySelect,
};

/// Returns an existing author by name if it exists, otherwise creating and
/// returning a new author record
pub async fn upsert_author(
	db: &impl ConnectionTrait,
	name: &str,
) -> Result<author::Model, DbErr> {
	let existing = author::Entity::find()
		.filter(author::Column::Name.eq(name))
		.one(db)
		.await?;

	match existing {
		Some(existing_author) => Ok(existing_author),
		None => {
			let inserted = author::ActiveModel {
				name: Set(name.to_string()),
				..Default::default()
			}
			.insert(db)
			.await?;

			Ok(inserted)
		},
	}
}

/// A struct to help with linking authors to media entries
#[derive(Debug, Clone)]
pub struct AuthorLink {
	pub name: String,
	pub role: AuthorRole,
}

// TODO: duplicate AuthorRole::Primary??
#[tracing::instrument(skip(db, links), fields(media_id = media_id))]
pub async fn link_media_authors(
	db: &impl ConnectionTrait,
	media_id: &str,
	links: Vec<AuthorLink>,
) -> Result<(), DbErr> {
	for AuthorLink { name, role } in links {
		let author = upsert_author(db, &name).await?;

		let active_model = media_author::ActiveModel {
			media_id: Set(media_id.to_string()),
			author_id: Set(author.id),
			role: Set(role),
			created_at: Set(Utc::now()),
			..Default::default()
		};

		let _result = media_author::Entity::insert(active_model)
			.on_conflict(
				OnConflict::columns([
					media_author::Column::MediaId,
					media_author::Column::AuthorId,
				])
				.do_nothing()
				.to_owned(),
			)
			.exec(db)
			.await?;

		tracing::trace!(?author.name, "Upserted link between author and book");
	}

	Ok(())
}

#[tracing::instrument(skip(db), fields(series_id = series_id))]
pub async fn link_media_authors_to_parent_series(
	db: &impl ConnectionTrait,
	series_id: &str,
) -> Result<(), DbErr> {
	let media_authors = media_author::Entity::find()
		.filter(
			media_author::Column::MediaId.in_subquery(
				Query::select()
					.column(media::Column::Id)
					.from(media::Entity)
					.and_where(media::Column::SeriesId.eq(series_id))
					.to_owned(),
			),
		)
		.distinct() // TODO: needed?
		.all(db)
		.await?;

	if media_authors.is_empty() {
		return Ok(());
	}

	for record in media_authors {
		let active_model = series_author::ActiveModel {
			series_id: Set(series_id.to_string()),
			author_id: Set(record.author_id),
			role: Set(record.role),
			created_at: Set(Utc::now()),
			..Default::default()
		};

		let _result = series_author::Entity::insert(active_model)
			.on_conflict(
				OnConflict::columns([
					series_author::Column::SeriesId,
					series_author::Column::AuthorId,
				])
				.do_nothing()
				.to_owned(),
			)
			.exec(db)
			.await?;
	}

	Ok(())
}

// TODO: fake_data tests
