use tracing::error;

use crate::db::entity::metadata::MediaMetadata;

pub fn is_accepted_cover_name(name: &str) -> bool {
	let cover_file_names = ["cover", "thumbnail", "folder"];
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

pub(crate) fn sort_file_names<S>(file_names: &mut [S])
where
	S: AsRef<str>,
{
	alphanumeric_sort::sort_str_slice(file_names);
}

#[cfg(test)]
mod tests {
	#[test]
	fn test_is_accepted_cover_name() {
		let cover_file_names = ["cover", "thumbnail", "folder"];
		for cover_name in cover_file_names {
			assert!(super::is_accepted_cover_name(cover_name));
		}
	}

	#[test]
	fn test_is_not_accepted_cover_name() {
		let cover_file_names = vec!["cover1", "thumbnail1", "folder1"];
		for cover_name in cover_file_names {
			assert!(!super::is_accepted_cover_name(cover_name));
		}
	}

	#[test]
	fn test_sort_numeric_file_names() {
		let mut names = ["3.jpg", "1.jpg", "5.jpg", "2.jpg", "4.jpg"];
		super::sort_file_names(&mut names);
		let expected = ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg"];
		assert_eq!(names, expected);
	}

	#[test]
	fn test_sort_alphanumeric_file_names() {
		let mut names = ["shot-2", "shot-1", "shot-11", "shot-10", "shot-3"];
		super::sort_file_names(&mut names);
		let expected = ["shot-1", "shot-2", "shot-3", "shot-10", "shot-11"];
		assert_eq!(names, expected);
	}
}
