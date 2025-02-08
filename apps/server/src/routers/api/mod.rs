pub(crate) mod filters;
pub(crate) mod v1;

use axum::Router;

use crate::config::state::AppState;

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new().nest("/api", Router::new().nest("/v1", v1::mount(app_state)))
}

// TODO: move codegen to api/mod.rs

#[allow(unused_imports)]
mod tests {
	use std::{fs::File, io::Write, path::PathBuf};

	use specta::{
		ts::{export, BigIntExportBehavior, ExportConfiguration, TsExportError},
		NamedType,
	};

	use stump_core::config::StumpConfig;

	use crate::{
		config::jwt::CreatedToken,
		filter::*,
		routers::api::v1::{
			api_key::*,
			auth::*,
			book_club::*,
			config::*,
			emailer::*,
			epub::*,
			job::*,
			library::*,
			media::{individual::*, thumbnails::*},
			metadata::*,
			series::*,
			smart_list::*,
			user::*,
			ClaimResponse, StumpVersion, UpdateCheck,
		},
	};

	#[allow(dead_code)]
	fn ts_export<T>() -> Result<String, TsExportError>
	where
		T: NamedType,
	{
		export::<T>(&ExportConfiguration::new().bigint(BigIntExportBehavior::Number))
	}

	#[test]
	#[ignore]
	fn codegen() -> Result<(), Box<dyn std::error::Error>> {
		let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
			.join("../../packages/sdk/src/types")
			.join("generated.ts");

		if !path.exists() {
			panic!(
				"Please run `cargo run --package codegen` first to generate the types"
			);
		}

		println!(
			"Please ensure to only generate types using `cargo run --package codegen`"
		);

		let mut file = std::fs::OpenOptions::new().append(true).open(path)?;

		file.write_all(b"// SERVER TYPE GENERATION\n\n")?;

		file.write_all(format!("{}\n\n", ts_export::<ClaimResponse>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<StumpVersion>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<UpdateCheck>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<AuthenticationOptions>()?).as_bytes(),
		)?;
		file.write_all(format!("{}\n\n", ts_export::<CreatedToken>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<LoginResponse>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<LoginOrRegisterArgs>()?).as_bytes(),
		)?;
		file.write_all(format!("{}\n\n", ts_export::<CreateUser>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<UpdateUser>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<UpdateUserPreferences>()?).as_bytes(),
		)?;
		file.write_all(format!("{}\n\n", ts_export::<DeleteUser>()?).as_bytes())?;

		file.write_all(
			format!("{}\n\n", ts_export::<CreateOrUpdateAPIKey>()?).as_bytes(),
		)?;
		file.write_all(format!("{}\n\n", ts_export::<CreatedAPIKey>()?).as_bytes())?;

		file.write_all(
			format!("{}\n\n", ts_export::<EmailerIncludeParams>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<EmailerSendRecordIncludeParams>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<SendAttachmentEmailsPayload>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<SendAttachmentEmailResponse>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<CreateOrUpdateEmailer>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<CreateOrUpdateEmailDevice>()?).as_bytes(),
		)?;
		file.write_all(format!("{}\n\n", ts_export::<PatchEmailDevice>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<FilterBody<(), ()>>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<LogFilter>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<LibraryBaseFilter>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<LibraryRelationFilter>()?).as_bytes(),
		)?;
		file.write_all(format!("{}\n\n", ts_export::<LibraryFilter>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<ReadStatus>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<MediaMetadataBaseFilter>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<MediaMetadataRelationFilter>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<MediaMetadataFilter>()?).as_bytes(),
		)?;
		file.write_all(format!("{}\n\n", ts_export::<MediaBaseFilter>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<MediaFilter>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<BookRelations>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<SeriesBaseFilter>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<SeriesMetadataFilter>()?).as_bytes(),
		)?;
		file.write_all(format!("{}\n\n", ts_export::<SeriesFilter>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<ValueOrRange<String>>()?).as_bytes(),
		)?;
		file.write_all(format!("{}\n\n", ts_export::<Range<String>>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<UserQueryRelation>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<SeriesQueryRelation>()?).as_bytes(),
		)?;
		file.write_all(format!("{}\n\n", ts_export::<CreateLibrary>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<UpdateLibrary>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<UpdateLibraryExcludedUsers>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<CleanLibraryResponse>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<GenerateLibraryThumbnails>()?).as_bytes(),
		)?;
		file.write_all(format!("{}\n\n", ts_export::<LibraryStatsParams>()?).as_bytes())?;

		file.write_all(
			format!("{}\n\n", ts_export::<PutMediaCompletionStatus>()?).as_bytes(),
		)?;
		file.write_all(format!("{}\n\n", ts_export::<MediaIsComplete>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<MediaMetadataOverview>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<CreateOrUpdateBookmark>()?).as_bytes(),
		)?;
		file.write_all(format!("{}\n\n", ts_export::<DeleteBookmark>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<SeriesIsComplete>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<UpdateSchedulerConfig>()?).as_bytes(),
		)?;

		file.write_all(format!("{}\n\n", ts_export::<GetBookClubsParams>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<CreateBookClub>()?).as_bytes())?;
		file.write_all(format!("{}\n\n", ts_export::<UpdateBookClub>()?).as_bytes())?;
		// file.write_all(
		// 	format!("{}\n\n", ts_export::<UpdateBookClubSchedule>()?).as_bytes(),
		// )?;
		file.write_all(
			format!("{}\n\n", ts_export::<CreateBookClubInvitation>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<BookClubInvitationAnswer>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<CreateBookClubMember>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<UpdateBookClubMember>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<CreateBookClubScheduleBookOption>()?)
				.as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<CreateBookClubScheduleBook>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<CreateBookClubSchedule>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<PatchMediaThumbnail>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<PatchSeriesThumbnail>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<PatchLibraryThumbnail>()?).as_bytes(),
		)?;

		file.write_all(
			format!("{}\n\n", ts_export::<CreateOrUpdateSmartList>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<GetSmartListsParams>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<SmartListRelationOptions>()?).as_bytes(),
		)?;
		file.write_all(format!("{}\n\n", ts_export::<SmartListMeta>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<CreateOrUpdateSmartListView>()?).as_bytes(),
		)?;

		file.write_all(format!("{}\n\n", ts_export::<UploadConfig>()?).as_bytes())?;

		file.write_all(format!("{}\n\n", ts_export::<StumpConfig>()?).as_bytes())?;

		Ok(())
	}
}
