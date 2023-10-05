use axum::Router;

use crate::config::state::AppState;

pub(crate) mod v1;

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new().nest("/api", Router::new().nest("/v1", v1::mount(app_state)))
}

#[allow(unused_imports)]
mod tests {
	use std::{fs::File, io::Write, path::PathBuf};

	use specta::{
		ts::{export, BigIntExportBehavior, ExportConfiguration, TsExportError},
		NamedType,
	};

	use super::v1::{
		auth::LoginOrRegisterArgs, job::UpdateSchedulerConfig,
		library::PatchLibraryThumbnail, media::PatchMediaThumbnail,
		metadata::MediaMetadataOverview, series::PatchSeriesThumbnail, ClaimResponse,
		StumpVersion,
	};

	#[allow(dead_code)]
	fn ts_export<T>() -> Result<String, TsExportError>
	where
		T: NamedType,
	{
		export::<T>(&ExportConfiguration::new().bigint(BigIntExportBehavior::BigInt))
	}

	#[test]
	#[ignore]
	fn codegen() -> Result<(), Box<dyn std::error::Error>> {
		let mut file = File::create(
			PathBuf::from(env!("CARGO_MANIFEST_DIR"))
				.join("../../packages/types")
				.join("server.ts"),
		)?;

		file.write_all(b"/* eslint-disable @typescript-eslint/ban-types */\n")?;
		file.write_all(b"// DO NOT MODIFY THIS FILE, IT IS AUTOGENERATED\n\n")?;

		file.write_all(format!("{}\n\n", ts_export::<StumpVersion>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<LoginOrRegisterArgs>()?).as_bytes(),
		)?;
		file.write_all(format!("{}\n\n", ts_export::<ClaimResponse>()?).as_bytes())?;
		file.write_all(
			format!("{}\n\n", ts_export::<MediaMetadataOverview>()?).as_bytes(),
		)?;
		file.write_all(
			format!("{}\n\n", ts_export::<UpdateSchedulerConfig>()?).as_bytes(),
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

		Ok(())
	}
}
