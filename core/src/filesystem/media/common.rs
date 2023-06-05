use super::Metadata;

pub fn is_accepted_cover_name(name: &str) -> bool {
	let cover_file_names = vec!["cover", "thumbnail", "folder"];
	cover_file_names
		.iter()
		.any(|&cover_name| name.eq_ignore_ascii_case(cover_name))
}

pub(crate) fn metadata_from_buf(contents: String) -> Option<Metadata> {
	if contents.is_empty() {
		return None;
	}

	match serde_xml_rs::from_str(&contents) {
		Ok(meta) => Some(meta),
		_ => None,
	}
}
