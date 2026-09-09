use async_graphql::{ComplexObject, Context, Result, SimpleObject};
use models::{entity::media, shared::readium::ReadiumLocator};
use num_traits::ToPrimitive;
use sea_orm::{prelude::*, QuerySelect};
use stump_core::filesystem::media::ReadiumManifestGenerator;
use tokio::task::spawn_blocking;

use crate::data::CoreContext;

/// the current reading position for a book, derived from the latest session
/// with the highest `readthrough_number`
#[derive(Debug, Clone, SimpleObject)]
#[graphql(complex)]
pub struct ResumeReadingCursor {
	pub readthrough_number: i32,
	/// the id of the session this cursor is derived from
	pub session_id: i32,
	pub page: Option<i32>,
	pub locator: Option<ReadiumLocator>,
	pub percentage_completed: Option<Decimal>,
	/// total reading time across all sessions in the current readthrough
	pub elapsed_seconds: i64,
	/// when the very first session in the current readthrough started
	pub started_at: Option<DateTimeWithTimeZone>,
	// the last time the latest session in the current readthrough was updated
	pub updated_at: Option<DateTimeWithTimeZone>,
	#[graphql(skip)]
	pub media_id: String,
}

#[ComplexObject]
impl ResumeReadingCursor {
	// TODO: im curious if perhaps i should just write positions of ebooks to
	// db upon ingestion? then if changed/rebuilt regenerate it? that would save
	// compute, which admittedly i have not measured so have little more than
	// gut feelings here

	/// A page number computed from the current locator's `total_progression` relative
	/// to the computed positions list for the book.
	async fn position_aware_page(&self, ctx: &Context<'_>) -> Result<Option<i32>> {
		let total_progression = match self
			.locator
			.as_ref()
			.and_then(|l| l.locations.as_ref())
			.and_then(|loc| loc.total_progression)
		{
			Some(decimal) => decimal.to_f64().unwrap_or(0.0),
			None => return Ok(None),
		};

		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let Some(book) = media::Entity::find_by_id(self.media_id.clone())
			.select_only()
			.columns(media::MediaIdentSelect::columns())
			.filter(media::Column::Extension.like("epub"))
			.into_model::<media::MediaIdentSelect>()
			.one(conn)
			.await?
		else {
			// no error because filtered by extension and the book likely exists and is not an epub.
			// realistically we should never even get here if not epub, since locator should not
			// be set on non-epubs, but guard against it nonetheless
			return Ok(None);
		};

		// the base_url (second param) is only used for href contruction, which we do not care
		// about here, and so the empty string is fine
		let generator = ReadiumManifestGenerator::new(&book.path, "");
		let positions = spawn_blocking(move || generator.generate_positions())
			.await
			.map_err(|e| async_graphql::Error::new(e.to_string()))??;

		// finding the last position whose total_progression <= the stored value is
		// roughly the page number
		let page = positions
			.positions
			.iter()
			.filter(|p| p.locations.total_progression <= total_progression)
			.next_back()
			.map(|p| p.locations.position as i32);

		Ok(page)
	}
}
