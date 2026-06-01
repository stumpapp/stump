pub mod encryption;
pub mod serde;

/// returns a sensible default concurrency limit based on the number of logical cpus
/// available to the process
pub fn get_cpu_concurrency_limit() -> usize {
	std::thread::available_parallelism()
		.map(|n| n.get() * 2)
		.unwrap_or(2)
}

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
