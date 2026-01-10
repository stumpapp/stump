use async_graphql::{CustomValidator, InputObject, InputValueError, Result};

// TODO(scheduler): Support more complex job configs:
// enum ScheduledJobConfigType {
// 	Interval(IntervalTypeJobConfig),
// 	Override(OverrideTypeJobConfig),
// }
// ^ Maybe? idk for like "skip next interval" or "run immediately"
// We could get fancy with this and allow for workflow type shit like
// "scan these libraries then queue media fetching then queue thumbs"
// Leaving as separate file jussst in case I actually do that

#[derive(Debug, Clone, InputObject)]
pub struct ScheduledJobConfigInput {
	pub interval_secs: i32,
	pub included_library_ids: Vec<String>,
}

/// A custom validator for the ScheduledJobConfigInput enum that ensures that the input is valid:
/// 1. The interval must be greater than 0
/// 2. At least one library must be included
#[derive(Default)]
pub struct ScheduledJobConfigValidator;

impl CustomValidator<ScheduledJobConfigInput> for ScheduledJobConfigValidator {
	fn check(
		&self,
		input: &ScheduledJobConfigInput,
	) -> Result<(), InputValueError<ScheduledJobConfigInput>> {
		if input.interval_secs <= 0 {
			Err(InputValueError::custom("Interval must be greater than 0"))
		} else if input.included_library_ids.is_empty() {
			Err(InputValueError::custom(
				"At least one library must be included",
			))
		} else {
			Ok(())
		}
	}
}
