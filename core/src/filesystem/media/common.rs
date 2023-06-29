use tracing::error;

use crate::db::entity::metadata::MediaMetadata;

pub fn is_accepted_cover_name(name: &str) -> bool {
	let cover_file_names = vec!["cover", "thumbnail", "folder"];
	cover_file_names
		.iter()
		.any(|&cover_name| name.eq_ignore_ascii_case(cover_name))
}

pub(crate) fn metadata_from_buf(contents: String) -> Option<MediaMetadata> {
	let adjusted = contents.trim();
	// let adjusted = adjusted.trim_start_matches("<?xml version=\"1.0\" encoding=\"utf-8\"?>");

	if adjusted.is_empty() {
		return None;
	}

	match serde_xml_rs::from_str(adjusted) {
		Ok(meta) => Some(meta),
		Err(err) => {
			error!(error = ?err, content = adjusted, "Failed to parse metadata from buf");
			None
		},
	}
}
