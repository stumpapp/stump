mod log;

use log::LogSubscription;

#[derive(async_graphql::MergedSubscription, Default)]
pub struct Subscription(LogSubscription);
