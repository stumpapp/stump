pub fn assert_no_errors(response: &serde_json::Value) {
	assert!(
		response.get("errors").is_none(),
		"should not have had errors: {response:#}"
	);
}

pub fn assert_forbidden(response: &serde_json::Value) {
	assert!(
		response["errors"]
			.as_array()
			.is_some_and(|errors| errors.iter().any(|error| {
				error["message"] == "You do not have permission to perform this action."
			})),
		"should have been a forbidden error: {response:#}"
	);
}
