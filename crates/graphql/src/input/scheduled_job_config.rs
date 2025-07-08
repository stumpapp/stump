use async_graphql::InputObject;

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
	interval_secs: i32,
	included_libraries: Vec<String>,
}
