pub(crate) fn is_accepted_cover_name(name: &str) -> bool {
	let cover_file_names = vec!["cover", "thumbnail", "folder"];
	cover_file_names
		.iter()
		.any(|&cover_name| name.eq_ignore_ascii_case(cover_name))
}
