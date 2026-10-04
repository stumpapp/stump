use async_graphql::{InputObject, MaybeUndefined};
use models::{entity::reading_session, shared::enums::ReadingStatus};
use sea_orm::{
	ActiveValue::{Set, Unchanged},
	IntoActiveModel,
};

#[derive(Debug, Default, InputObject)]
pub struct PatchReadingSession {
	pub elapsed_seconds: MaybeUndefined<String>,
	pub status: Option<ReadingStatus>,
	// TODO: this would be a big antipattern and should eventually be corrected, created_at/updated_at
	// should really be internal-only and now that we are exposing them as less system and more "you
	// started at X and ended at Y and can change them afterwards if youd like" they should likely
	// be separate fields. it's not that deep in the sense that this is self-hosted software, and
	// maybe it would suffice to just document it, but leaving until i make a decision i guess
	// no it is that deep because the auto-updating timestamp would be a pita to work with
	// as-is with user-editable stamps
	// pub started_at: Option<DateTimeWithTimeZone>,
	// pub finished_at: Option<DateTimeWithTimeZone>,
}

impl PatchReadingSession {
	pub fn apply(self, model: reading_session::Model) -> reading_session::ActiveModel {
		let PatchReadingSession {
			elapsed_seconds,
			status,
		} = self;

		reading_session::ActiveModel {
			elapsed_seconds: match elapsed_seconds {
				MaybeUndefined::Undefined => Unchanged(model.elapsed_seconds),
				MaybeUndefined::Null => Set(None),
				MaybeUndefined::Value(v) => Set(Some(v.parse::<i64>().unwrap_or(0))),
			},
			status: match status {
				Some(s) => Set(s),
				None => Unchanged(model.status),
			},
			..model.into_active_model()
		}
	}
}
