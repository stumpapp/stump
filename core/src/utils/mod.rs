pub mod encryption;
pub mod serde;

pub fn chain_optional_iter<T>(
	required: impl IntoIterator<Item = T>,
	optional: impl IntoIterator<Item = Option<T>>,
) -> Vec<T> {
	required
		.into_iter()
		.map(Some)
		.chain(optional)
		.flatten()
		.collect()
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_chain_optional_iter() {
		let required = vec![1, 2, 3];
		let optional = vec![Some(4), None, Some(5)];

		let res = chain_optional_iter(required, optional);
		assert_eq!(res, vec![1, 2, 3, 4, 5]);
	}
}
