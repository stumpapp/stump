enum FilenameToken {}

struct FilenameLexer<'a> {
	filename: &'a str,

	cur_idx: usize,
}

impl<'a> FilenameLexer<'a> {
	pub fn new(filename: &'a str) -> Self {
		Self {
			filename,
			cur_idx: 0,
		}
	}

	pub fn get_next_token(&mut self) -> Option<FilenameToken> {
		todo!()
	}

	fn next_char(&mut self) -> Option<char> {
		if self.cur_idx > self.filename.len() - 1 {
			return None;
		}

		self.cur_idx += 1;
		// TODO - Better solution, this won't work for certain two-byte unicode characters.
		self.filename.chars().nth(self.cur_idx)
	}
}
