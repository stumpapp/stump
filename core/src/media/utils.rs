pub(crate) fn sort_file_names<S>(file_names: &mut [S])
where
	S: AsRef<str>,
{
	alphanumeric_sort::sort_str_slice(file_names);
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_sort_numeric_file_names() {
		let mut names = ["3.jpg", "1.jpg", "5.jpg", "2.jpg", "4.jpg"];
		sort_file_names(&mut names);
		let expected = ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg"];
		assert_eq!(names, expected);
	}

	#[test]
	fn test_sort_alphanumeric_file_names() {
		let mut names = ["shot-2", "shot-1", "shot-11", "shot-10", "shot-3"];
		sort_file_names(&mut names);
		let expected = ["shot-1", "shot-2", "shot-3", "shot-10", "shot-11"];
		assert_eq!(names, expected);
	}
}
