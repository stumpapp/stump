use models::entity::*;
use sea_orm::{DbBackend, Schema};
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
	async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
		let schema = Schema::new(DbBackend::Sqlite);

		manager
			.create_table(schema.create_table_from_entity(age_restriction::Entity))
			.await?;

		// Create the book club related tables
		manager
			.create_table(schema.create_table_from_entity(api_key::Entity))
			.await?;

		manager
			.create_table(
				schema.create_table_from_entity(book_club_book_suggestion_like::Entity),
			)
			.await?;
		manager
			.create_table(
				schema.create_table_from_entity(book_club_book_suggestion::Entity),
			)
			.await?;
		manager
			.create_table(schema.create_table_from_entity(book_club_book::Entity))
			.await?;
		manager
			.create_table(
				schema
					.create_table_from_entity(book_club_discussion_message_like::Entity),
			)
			.await?;
		manager
			.create_table(
				schema.create_table_from_entity(book_club_discussion_message::Entity),
			)
			.await?;
		manager
			.create_table(schema.create_table_from_entity(book_club_discussion::Entity))
			.await?;
		manager
			.create_table(schema.create_table_from_entity(book_club_invitation::Entity))
			.await?;
		manager
			.create_table(
				schema.create_table_from_entity(book_club_member_favorite_book::Entity),
			)
			.await?;
		manager
			.create_table(schema.create_table_from_entity(book_club_member::Entity))
			.await?;
		manager
			.create_table(schema.create_table_from_entity(book_club_schedule::Entity))
			.await?;
		manager
			.create_table(schema.create_table_from_entity(book_club::Entity))
			.await?;

		manager
			.create_table(schema.create_table_from_entity(bookmark::Entity))
			.await?;

		// TODO(sea-orm): This is unused, determine if we punt it for later
		// manager
		// 	.create_table(schema.create_table_from_entity(collection::Entity))
		// 	.await?;

		// Create the emailer related tables
		manager
			.create_table(schema.create_table_from_entity(emailer_send_record::Entity))
			.await?;
		manager
			.create_table(schema.create_table_from_entity(emailer::Entity))
			.await?;
		manager
			.create_table(
				schema.create_table_from_entity(registered_email_device::Entity),
			)
			.await?;

		manager
			.create_table(schema.create_table_from_entity(job::Entity))
			.await?;
		manager
			.create_table(schema.create_table_from_entity(scheduled_job_config::Entity))
			.await?;
		manager
			.create_table(schema.create_table_from_entity(scheduled_job_library::Entity))
			.await?;

		manager
			.create_table(schema.create_table_from_entity(last_library_visit::Entity))
			.await?;
		manager
			.create_table(schema.create_table_from_entity(library::Entity))
			.await?;
		manager
			.create_table(schema.create_table_from_entity(library_exclusion::Entity))
			.await?;
		manager
			.create_table(schema.create_table_from_entity(library_config::Entity))
			.await?;
		manager
			.create_table(schema.create_table_from_entity(library_scan_record::Entity))
			.await?;
		manager
			.create_table(schema.create_table_from_entity(library_tag::Entity))
			.await?;

		manager
			.create_table(schema.create_table_from_entity(log::Entity))
			.await?;

		manager
			.create_table(schema.create_table_from_entity(media::Entity))
			.await?;
		// TODO(perf): Index for series_id? Not sure it would really make a diff or just be
		// more overhead
		manager
			.create_table(schema.create_table_from_entity(media_annotation::Entity))
			.await?;
		manager
			.create_table(schema.create_table_from_entity(media_metadata::Entity))
			.await?;
		// Create an index on `media_id`
		manager
			.create_index(
				Index::create()
					.unique()
					.name("media_metadata_media_id_idx")
					.table(media_metadata::Entity)
					.col(media_metadata::Column::MediaId)
					.to_owned(),
			)
			.await?;
		manager
			.create_table(schema.create_table_from_entity(media_tag::Entity))
			.await?;
		manager
			.create_table(schema.create_table_from_entity(page_dimension::Entity))
			.await?;
		manager
			.create_table(schema.create_table_from_entity(reading_session::Entity))
			.await?;
		manager
			.create_index(
				Index::create()
					.unique()
					.name("reading_session_media_id_user_id_idx")
					.table(reading_session::Entity)
					.col(reading_session::Column::MediaId)
					.col(reading_session::Column::UserId)
					.to_owned(),
			)
			.await?;

		manager
			.create_table(
				schema.create_table_from_entity(finished_reading_session::Entity),
			)
			.await?;
		manager
			.create_table(
				schema.create_table_from_entity(registered_reading_device::Entity),
			)
			.await?;

		manager
			.create_table(schema.create_table_from_entity(review::Entity))
			.await?;

		manager
			.create_table(schema.create_table_from_entity(notifier::Entity))
			.await?;

		// TODO(sea-orm): These are unused, determine if we punt it for later
		// reading_list_item
		// reading_list_rule
		// reading_list

		manager
			.create_table(schema.create_table_from_entity(series::Entity))
			.await?;
		manager
			.create_table(schema.create_table_from_entity(series_metadata::Entity))
			.await?;
		// Create an index on `series_id`
		manager
			.create_index(
				Index::create()
					.unique()
					.name("series_metadata_series_id_idx")
					.table(series_metadata::Entity)
					.col(series_metadata::Column::SeriesId)
					.to_owned(),
			)
			.await?;
		manager
			.create_table(schema.create_table_from_entity(series_tag::Entity))
			.await?;

		manager
			.create_table(schema.create_table_from_entity(server_config::Entity))
			.await?;
		manager
			.create_table(schema.create_table_from_entity(server_invitation::Entity))
			.await?;

		// TODO(sea-orm): Index user_id?
		manager
			.create_table(schema.create_table_from_entity(session::Entity))
			.await?;
		manager
			.create_table(schema.create_table_from_entity(refresh_token::Entity))
			.await?;

		manager
			.create_table(schema.create_table_from_entity(smart_list_access_rule::Entity))
			.await?;
		manager
			.create_table(schema.create_table_from_entity(smart_list_view::Entity))
			.await?;
		manager
			.create_table(schema.create_table_from_entity(smart_list::Entity))
			.await?;

		manager
			.create_table(schema.create_table_from_entity(tag::Entity))
			.await?;

		manager
			.create_table(schema.create_table_from_entity(user_login_activity::Entity))
			.await?;
		manager
			.create_table(schema.create_table_from_entity(user_preferences::Entity))
			.await?;

		manager
			.create_table(schema.create_table_from_entity(user::Entity))
			.await?;

		manager
			.create_table(schema.create_table_from_entity(favorite_library::Entity))
			.await?;
		manager
			.create_table(schema.create_table_from_entity(favorite_media::Entity))
			.await?;
		manager
			.create_table(schema.create_table_from_entity(favorite_series::Entity))
			.await?;

		Ok(())
	}

	async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
		Ok(())
	}
}
