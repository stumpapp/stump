/****************************************
*
* This file is slightly modified from the original. See the original file at:
* https://gitlab.com/t101/to_snake_case/-/tree/main
*
* The original file is licensed under the Apache License, Version 2.0.
* See: https://gitlab.com/t101/to_snake_case/-/blob/main/LICENSE.md
*
* I have made changes primarily to remove the use of let_chains, which are not
* yet stable in Rust.
* The tracking issue is: https://github.com/rust-lang/rust/issues/53667
*
******************************************/

pub trait ToSnakeCase: AsRef<str> {
	fn to_snake_case(&self) -> String;
}

impl<T> ToSnakeCase for T
where
	T: AsRef<str>,
{
	fn to_snake_case(&self) -> String {
		let text = self.as_ref();

		let mut buffer = String::with_capacity(text.len() + text.len() / 2);

		let mut text = text.chars();

		if let Some(first) = text.next() {
			let mut n2: Option<(bool, char)> = None;
			let mut n1: (bool, char) = (first.is_lowercase(), first);

			for c in text {
				let prev_n1 = n1;

				let n3 = n2;
				n2 = Some(n1);
				n1 = (c.is_lowercase(), c);

				// insert underscore if acronym at beginning
				// ABc -> a_bc
				match (n3, n2) {
					(Some((false, c3)), Some((false, c2)))
						if n1.0 && c3.is_uppercase() && c2.is_uppercase() =>
					{
						buffer.push('_');
					},
					_ => (),
				}

				buffer.push_str(&prev_n1.1.to_lowercase().to_string());

				// insert underscore before next word
				// abC -> ab_c
				match n2 {
					Some((true, _)) if n1.1.is_uppercase() => {
						buffer.push('_');
					},
					_ => (),
				}
			}

			buffer.push_str(&n1.1.to_lowercase().to_string());
		}

		buffer
	}
}
