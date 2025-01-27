//! This module defines functions to be run every time the server starts in order to
//! configure the database as needed by other portions of the code.

use std::collections::HashSet;

use crate::{prisma, CoreResult};

// TODO - Redraft this documentation
/// Set up the database entries for metadata sources. This function will ensure that each of the
/// sources listed in [`metadata_sources::REGISTERED_SOURCES`] are included in the database, adding
/// any that are missing and enabling them by default.
///
/// A source which no longer has an implementation may still be present in the database as currently
/// implemented, but will return an error when used to fetch the associated [`MetadataSource`] impl
/// using [`get_source_by_name`].
pub(crate) async fn run_startup_process(client: &prisma::PrismaClient) -> CoreResult<()> {
	let db_sources = client.metadata_sources().find_many(vec![]).exec().await?;
	let existing_identities: HashSet<&str> =
		db_sources.iter().map(|s| s.name.as_str()).collect();

	// Determine missing entries
	let missing: Vec<_> = metadata_sources::REGISTERED_SOURCES
		.iter()
		.filter_map(|source_name| {
			if !existing_identities.contains(source_name) {
				// We need setters determined based on whether or not a config is needed
				let source_impl = metadata_sources::get_source_by_name(source_name)
					.expect("Any source in REGISTERED_SOURCES resolve");
				let setters = match source_impl.get_default_config() {
					Some(default) => prisma::metadata_sources::config::set(Some(default)),
					None => prisma::metadata_sources::config::set(None),
				};

				// (Id, enabled, set_params)
				// By default, new sources are enabled
				Some((source_name.to_string(), true, vec![setters]))
			} else {
				// No need to create existing sources
				None
			}
		})
		.collect();
	// Create them if necessary
	if !missing.is_empty() {
		client
			.metadata_sources()
			.create_many(missing)
			.exec()
			.await?;
	}

	Ok(())
}
