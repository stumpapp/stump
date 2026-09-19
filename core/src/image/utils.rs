use std::path::Path;

use crate::fs_utils::{FileParts, PathUtils};

pub fn is_common_thumbnail_image(path: &Path) -> bool {
	if !path.is_image() {
		return false;
	}

	let FileParts { file_stem, .. } = path.file_parts();

	is_common_thumbnail_name(&file_stem)
}

fn is_common_thumbnail_name(name: &str) -> bool {
	let cover_file_names = ["cover", "thumbnail", "folder"];
	cover_file_names
		.iter()
		.any(|&cover_name| name.eq_ignore_ascii_case(cover_name))
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_is_common_thumbnail_image_non_image() {
		let path = Path::new("test.txt");
		assert!(!is_common_thumbnail_image(path));
	}

	#[test]
	fn test_is_common_thumbnail_image_accepted_name() {
		let path = Path::new("cover.jpg");
		assert!(is_common_thumbnail_image(path));
	}

	#[test]
	fn test_is_common_thumbnail_name() {
		let cover_file_names = ["cover", "thumbnail", "folder"];
		for cover_name in cover_file_names {
			assert!(is_common_thumbnail_name(cover_name));
		}
	}

	#[test]
	fn test_is_not_accepted_cover_name() {
		let cover_file_names = vec!["cover1", "thumbnail1", "folder1"];
		for cover_name in cover_file_names {
			assert!(!is_common_thumbnail_name(cover_name));
		}
	}
}
